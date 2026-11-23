import { randomUUID } from 'node:crypto';
import { DuplicateSkuError, InvalidProductError, ProductNotFoundError } from '../domain/errors.js';
import {
  createProduct as createProductValue,
  type CreationMeta,
  type Product,
  type ProductData,
} from '../domain/product.js';
import type { InventoryStore } from '../repositories/inventoryStore.js';
import { createMovement, type Movement, type MovementType } from '../domain/movement.js';
import { applyMovement } from '../domain/stock.js';
import type { ProductRepository } from '../repositories/productRepository.js';

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

  async updateProduct(id: string, data: ProductData): Promise<Product> {
    if ('quantity' in data) {
      throw new InvalidProductError(['O saldo só pode ser alterado por movimentações.']);
    }
    return this.deps.store.transaction(async ({ products }) => {
      const current = await this.requireProduct(products, id);
      const validated = this.validatedProduct(data, { id: current.id, now: current.createdAt });
      const duplicate = await products.findBySku(validated.sku);
      if (duplicate && duplicate.id !== id) throw new DuplicateSkuError(validated.sku);
      const updated = { ...validated, quantity: current.quantity, active: current.active };
      await products.update(updated);
      return updated;
    });
  }

  async deactivateProduct(id: string): Promise<void> {
    await this.deps.store.transaction(async ({ products }) => {
      const current = await this.requireProduct(products, id);
      await products.update({ ...current, active: false });
    });
  }

  async registerMovement(
    productId: string,
    type: MovementType,
    quantity: number,
    reason = '',
  ): Promise<{ product: Product; movement: Movement }> {
    return this.deps.store.transaction(async ({ products, movements }) => {
      const product = await this.requireProduct(products, productId);
      const movement = createMovement(
        { productId, type, quantity, reason },
        { id: this.createId(), now: this.clock() },
      );
      const updated = applyMovement(product, movement);
      await products.update(updated);
      await movements.save(movement);
      return { product: updated, movement };
    });
  }

  private async requireProduct(products: ProductRepository, id: string): Promise<Product> {
    const product = await products.findById(id);
    if (!product) throw new ProductNotFoundError(id);
    return product;
  }

  private validatedProduct(data: ProductData, meta: CreationMeta): Product {
    const { sku, name, category, costCents, minStock } = data;
    return createProductValue({ sku, name, category, costCents, minStock }, meta);
  }
}
