import type { Product } from '../product.js';

/** Soma o valor em centavos do estoque dos produtos ativos. */
export function totalStockValue(products: readonly Product[]): number {
  return products.reduce((total, product) => {
    if (!product.active) return total;
    return total + product.quantity * product.costCents;
  }, 0);
}
