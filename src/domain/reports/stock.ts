import type { Product } from '../product.js';
import { isLowStock } from '../stock.js';

/** Soma o valor em centavos do estoque dos produtos ativos. */
export function totalStockValue(products: readonly Product[]): number {
  return products.reduce((total, product) => {
    if (!product.active) return total;
    return total + product.quantity * product.costCents;
  }, 0);
}

/** Lista produtos ativos com estoque baixo, por maior déficit e depois por SKU. */
export function lowStockList(products: readonly Product[]): Product[] {
  return products
    .filter((product) => product.active && isLowStock(product))
    .sort((left, right) => {
      const deficitDifference = right.minStock - right.quantity - (left.minStock - left.quantity);
      return deficitDifference || left.sku.localeCompare(right.sku, 'en');
    });
}
