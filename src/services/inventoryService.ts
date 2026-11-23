import { randomUUID } from 'node:crypto';
import { DuplicateSkuError } from '../domain/errors.js';
import {
  createProduct as createProductValue,
  type CreationMeta,
  type Product,
  type ProductData,
} from '../domain/product.js';
import type { InventoryStore } from '../repositories/inventoryStore.js';

export interface InventoryServiceDeps {
  store: InventoryStore;
  clock?: () => Date;
  createId?: () => string;
}

export class InventoryService {
  private readonly clock: () => Date;
  private readonly createId: () => string;

  constructor(private readonly deps: InventoryServiceDeps) {
    this.clock = deps.clock ?? (() => new Date());
    this.createId = deps.createId ?? randomUUID;
  }

  async createProduct(data: ProductData): Promise<Product> {
    return this.deps.store.transaction(async ({ products }) => {
      const product = this.validatedProduct(data, { id: this.createId(), now: this.clock() });
      if (await products.findBySku(product.sku)) throw new DuplicateSkuError(product.sku);
      await products.save(product);
      return product;
    });
  }

  private validatedProduct(data: ProductData, meta: CreationMeta): Product {
    const { sku, name, category, costCents, minStock } = data;
    return createProductValue({ sku, name, category, costCents, minStock }, meta);
  }
}
