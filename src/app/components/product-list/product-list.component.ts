import { Component, OnDestroy, OnInit} from '@angular/core';
import { CategoryService } from '../../services/category.service';
import { ProductService } from '../../services/product.service';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectorRef } from '@angular/core';
import { applyFilters } from '../../utils/filter-utils';
import { Subject, switchMap, tap, firstValueFrom, fromEvent, BehaviorSubject, takeUntil } from 'rxjs';

enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ScrollingModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class ProductListComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  public currentPage$ = new BehaviorSubject<number>(1);
  private productIndex$ = new BehaviorSubject<Map<string, any[]>>(new Map());
  filteredCount$ = new BehaviorSubject<number>(0);

  totalPages: number = 0;
  
  worker!: Worker;
  products: any[] = [];
  filteredProducts: any[] = [];
  priceRange: number[] = [0, 0];
  uniqueCategories: any[] = [];
  selectedCategories: string[] = []; // Categories to show when clicking "Apply" in the Filter sidebar
  tempSelectedCategories: string[] = []; // Tracks which categories are checked in the sidebar before clicking Apply

  // Filters
  searchFilter = new FormControl('');
  priceMin = new FormControl('');
  priceMax = new FormControl('');
  stockFilter = new FormControl(false); // The stock filter which is currently being displayed
  tempStockFilter = new FormControl(false); // Changes in real-time depending on other filter options
  volumeFrom = new FormControl('');
  volumeTo = new FormControl('');

  sortColumn: string = '';
  sortDirection: SortDirection = SortDirection.ASC;
  categoriesLoaded = false; // Keeps track if category filter dropdown has been pressed or not
  
  pageSize = 50;  // Number of products per page

  constructor(
    private categoryService: CategoryService,
    private productService: ProductService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./product.worker', import.meta.url), { type: 'module' });
  
      // Wraps worker messages in an Observable
      fromEvent<MessageEvent>(this.worker, 'message')
        .pipe(takeUntil(this.destroy$))
        .subscribe(({ data }) => {
          this.filteredProducts = data.filteredProducts;
          this.filteredCount$.next(data.filteredCount);
          this.totalPages = Math.max(1, Math.ceil(this.filteredProducts.length / this.pageSize));
          this.currentPage$.next(Math.min(this.currentPage$.value, this.totalPages));
          this.cdr.detectChanges();
        });
  
      // Fetch categories and process products
      this.categoryService.getAlotOfCategories()
        .pipe(
          switchMap(categoryTree => this.extractProducts(categoryTree)),
          tap(products => {
            this.products = products;
            this.filteredProducts = [...products];
            this.calculatePriceRange();
            this.extractUniqueCategories();
            this.filterProducts(); // Initial filter after data load
            this.cdr.detectChanges();
          }),
          takeUntil(this.destroy$) // Automatically clean up subscriptions
        )
        .subscribe();
    } else {
      console.warn('Web Workers not supported');
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.worker) {
      this.worker.terminate();
    }
  }

  async extractProducts(category: any): Promise<any[]> {
    let products: any[] = [];
  
    if (category.children?.length) {
      for (const child of category.children) {
        if (child.id.startsWith('s')) {
          const childProducts = await this.extractProducts(child);
          products.push(...childProducts);
        } else {
          let productData = {
            id: child.id,
            name: child.name,
            extra: { PRI: 0, LGA: 0, VOL: 0 },
            category: category.name
          };
  
          try {
            const fetchedProduct = await firstValueFrom(this.productService.getProduct(child.id));
            productData.extra = this.extractExtraValues(fetchedProduct?.extra ?? {});
          } catch {
            productData.extra = { PRI: 0, LGA: 0, VOL: 0 };
          }
  
          products.push(productData);
        }
      }
    }
  
    // Cache the indexed data reactively
    const index = new Map<string, any[]>();
    products.forEach(p => {
      const key = p.name.toLowerCase();
      if (!index.has(key)) index.set(key, []);
      index.get(key)!.push(p);
    });
  
    this.productIndex$.next(index);
    return products;
  }

  extractExtraValues(extra: any): { PRI: number; LGA: number; VOL: number } {
    let defaultValues = { PRI: 0, LGA: 0, VOL: 0 };

    if (!extra || typeof extra !== 'object') return defaultValues;

    for (const key of Object.keys(extra)) {
      if (typeof extra[key] === 'object') {
        const foundValues = this.extractExtraValues(extra[key]);
        if (foundValues.PRI || foundValues.LGA || foundValues.VOL) {
          return foundValues;
        }
      }
    }

    return {
      PRI: isNaN(parseFloat(extra?.PRI)) ? 0 : parseFloat(extra.PRI),
      LGA: isNaN(parseFloat(extra?.LGA)) ? 0 : parseFloat(extra.LGA),
      VOL: isNaN(parseFloat(extra?.VOL)) ? 0 : parseFloat(extra.VOL)
    };
  }

  extractUniqueCategories() {
    const categoryCount: { [key: string]: number } = {};
    this.products.forEach(product => {
      categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
    });
    this.uniqueCategories = Object.keys(categoryCount).map(name => ({ name, count: categoryCount[name] }));
  }
  

  calculatePriceRange() {
    if (!this.products || this.products.length === 0) {
      this.priceRange = [0, 0]; // Default values to prevent infinite recursion
      return;
    }
  
    const prices = this.products
      .map(p => p.extra?.PRI ?? 0) // Ensure `extra.PRI` exists, or default to 0
      .filter(price => price > 0); // Remove invalid values
    
    if (prices.length === 0) {
      this.priceRange = [0, 0];
      return;
    }
  
    this.priceRange = [Math.min(...prices), Math.max(...prices)];
  }



  // Updates temporary filter variable with currently selected categories in the filter sidebar
  toggleCategoryFilter(category: string) {
    if (this.tempSelectedCategories.includes(category)) {
      this.tempSelectedCategories = this.tempSelectedCategories.filter(c => c !== category);
    } else {
      this.tempSelectedCategories.push(category);
    }
  }

  applySidebarFilters() {
    this.selectedCategories = [...this.tempSelectedCategories];
    this.stockFilter.setValue(this.tempStockFilter.value);
  
    this.priceMin.setValue(this.priceMin.value || '');
    this.priceMax.setValue(this.priceMax.value || '');
    this.volumeFrom.setValue(this.volumeFrom.value || '');
    this.volumeTo.setValue(this.volumeTo.value || '');

    this.filterProducts(); // Apply filtering only when "Apply" is clicked
  }

  clearFilters() {
    this.tempSelectedCategories = [];
    this.tempStockFilter.setValue(false);
  
    this.priceMin.setValue('');
    this.priceMax.setValue('');
    this.volumeFrom.setValue('');
    this.volumeTo.setValue('');

    this.updateFilteredCount();
  }

  filtersApplied(): boolean {
    const hasValue = (val: any) => val != null && String(val).trim() !== '';
  
    return (
      hasValue(this.searchFilter.value) ||
      hasValue(this.priceMin.value) ||
      hasValue(this.priceMax.value) ||
      hasValue(this.volumeFrom.value) ||
      hasValue(this.volumeTo.value) ||
      !!this.stockFilter.value || 
      this.selectedCategories.length > 0 ||
      this.tempStockFilter.value ||
      this.tempSelectedCategories.length > 0
    );
  }

  filterProducts() {
    const filterParams = {
      query: this.searchFilter.value?.toLowerCase() || '',
      sortColumn: this.sortColumn,
      sortDirection: this.sortDirection,
      priceMin: this.priceMin.value ? parseFloat(this.priceMin.value) : 0,
      priceMax: this.priceMax.value ? parseFloat(this.priceMax.value) : Infinity,
      volumeFrom: this.volumeFrom.value ? parseFloat(this.volumeFrom.value) : 0,
      volumeTo: this.volumeTo.value ? parseFloat(this.volumeTo.value) : Infinity,
      stockFilter: this.stockFilter.value,
      selectedCategories: this.selectedCategories
    };
  
    if (this.worker) {
      this.worker.postMessage({ products: this.products, ...filterParams });
    } else {
      console.warn('Web Workers not supported, running manual filtering');

      this.filteredProducts = applyFilters(this.products, filterParams);

      this.totalPages = Math.max(1, Math.ceil(this.filteredProducts.length / this.pageSize));
      this.currentPage$.next(Math.min(this.currentPage$.value, this.totalPages));
      this.cdr.detectChanges();
    }
  }
    
  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC;
    } else {
      this.sortColumn = column;
      this.sortDirection = column === 'extra.LGA' ? SortDirection.DESC : SortDirection.ASC; // Default DESC for stock
    }
  
    this.sortProducts();
  }

  sortProducts() {
    this.filteredProducts.sort((a, b) => {
      let valueA = this.sortColumn.split('.').reduce((acc, key) => acc && acc[key] !== undefined ? acc[key] : '', a);
      let valueB = this.sortColumn.split('.').reduce((acc, key) => acc && acc[key] !== undefined ? acc[key] : '', b);
  
      // Handle strings (case-insensitive sorting)
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
  
      // Handle numbers (convert and compare properly)
      if (!isNaN(Number(valueA)) && !isNaN(Number(valueB))) {
        valueA = Number(valueA);
        valueB = Number(valueB);
      }
  
      // Apply sorting direction
      return (valueA > valueB ? 1 : -1) * (this.sortDirection === SortDirection.ASC ? 1 : -1);
    });
  
    this.cdr.detectChanges(); // Ensure UI updates
  }

  trackById(index: number, product: any): string {
    return product.id;
  }

  trackByCategory(index: number, category: any): string {
    return category.id;
  }

  inStockCount(): number {
    return this.products.filter(product => parseFloat(product.extra.LGA) > 0).length;
  }

  updateFilteredCount() {
    const filterParams = {
      query: this.searchFilter.value?.toLowerCase() || '',
      priceMin: this.priceMin.value ? parseFloat(this.priceMin.value) : 0,
      priceMax: this.priceMax.value ? parseFloat(this.priceMax.value) : Infinity,
      volumeFrom: this.volumeFrom.value ? parseFloat(this.volumeFrom.value) : 0,
      volumeTo: this.volumeTo.value ? parseFloat(this.volumeTo.value) : Infinity,
      stockFilter: this.tempStockFilter.value,
      selectedCategories: this.tempSelectedCategories
    };
  
    const filteredPreviewProducts = applyFilters(this.products, filterParams);
    this.filteredCount$.next(filteredPreviewProducts.length); // Updates filtered count for Apply Filter button
  }

  loadCategoriesIfNeeded() {
    if (!this.categoriesLoaded) {
      this.extractUniqueCategories();
      this.categoriesLoaded = true;
    }
  }

  get paginatedProducts() {
    if (!this.filteredProducts || this.filteredProducts.length === 0) {
      return []; // Return empty array so *ngIf triggers the "No Results" message
    }
    const start = (this.currentPage$.value - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredProducts.slice(start, end);
  }

  // Navigate to First Page
  goToFirstPage() {
    this.currentPage$.next(1);
  }

 // Navigate to Previous Page
  goToPreviousPage() {
    this.currentPage$.next(Math.max(1, this.currentPage$.value - 1));
  }

  // Navigate to Next Page
  goToNextPage() {
    this.currentPage$.next(Math.min(this.totalPages, this.currentPage$.value + 1));
  }

  // Navigate to Last Page
  goToLastPage() {
    this.currentPage$.next(this.totalPages);
  }

}