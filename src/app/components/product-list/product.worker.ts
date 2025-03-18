import { applyFilters } from '../../utils/filter-utils';

addEventListener('message', ({ data }) => {
  const { products, ...filterParams } = data;

  const filteredProducts = applyFilters(products, filterParams);
  
  postMessage(filteredProducts);
});