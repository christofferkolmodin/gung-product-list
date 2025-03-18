export function applyFilters(products: any[], filterParams: any): any[] {
  return products.filter(product => {
    const matchesSearch = filterParams.query.trim() === '' ||
      product.name.toLowerCase().includes(filterParams.query) ||
      product.id.toLowerCase().includes(filterParams.query) ||
      product.category.toLowerCase().includes(filterParams.query);

    const productPrice = parseFloat(product.extra?.PRI ?? '0');
    const productVolume = parseFloat(product.extra?.VOL ?? '0');
    const productStock = parseFloat(product.extra?.LGA ?? '0');

    const matchesPrice = productPrice >= filterParams.priceMin && productPrice <= filterParams.priceMax;
    const matchesVolume = productVolume >= filterParams.volumeFrom && productVolume <= filterParams.volumeTo;
    const matchesStock = !filterParams.stockFilter || productStock > 0;
    const matchesCategory = filterParams.selectedCategories.length === 0 || filterParams.selectedCategories.includes(product.category);

    return matchesSearch && matchesPrice && matchesStock && matchesVolume && matchesCategory;
  });
}