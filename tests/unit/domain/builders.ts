import type { Product, ProductData } from '../../../src/domain/product.js';

export const FIXED_DATE = new Date('2026-01-15T12:00:00.000Z');

export function validProductData(overrides: Partial<ProductData> = {}): ProductData {
  return {
    sku: 'CAF-500',
    name: 'Café torrado 500g',
    category: 'Mercearia',
    costCents: 1999,
    minStock: 5,
    ...overrides,
  };
}

export function aProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    sku: 'CAF-500',
    name: 'Café torrado 500g',
    category: 'Mercearia',
    costCents: 1999,
    minStock: 5,
    quantity: 10,
    active: true,
    createdAt: FIXED_DATE,
    ...overrides,
  };
}
