import { Routes } from '@angular/router';
import { ProductListComponent } from './components/product-list/product-list.component';
import { AboutComponent } from './components/about/about.component';

export const routes: Routes = [
  { path: '', redirectTo: '/products', pathMatch: 'full' }, // Default route
  { path: 'products', component: ProductListComponent },
  { path: 'about', component: AboutComponent }
];