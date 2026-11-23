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
import type { ProductFilters, ProductRepository } from '../repositories/productRepository.js';
import { lowStockList, totalStockValue } from '../domain/reports/stock.js';
import { movementSummary, type MovementSummary } from '../domain/reports/movements.js';

export interface InventoryServiceDeps {
  store: InventoryStore;
  clock?: () => Date;
  createId?: () => string;
}

export interface Dashboard {
  stockValueCents: number;
  activeProductCount: number;
  lowStockCount: number;
  lowStockProducts: Product[];
  movementSummary: MovementSummary;
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

  async listProducts(filters: ProductFilters = {}): Promise<Product[]> {
    return this.deps.store.repositories.products.list(filters);
  }

  async getProductHistory(id: string): Promise<{ product: Product; movements: Movement[] }> {
    const repositories = this.deps.store.repositories;
    const product = await this.requireProduct(repositories.products, id);
    const movements = await repositories.movements.listByProduct(id);
    movements.sort(
      (left, right) =>
        right.date.getTime() - left.date.getTime() || left.id.localeCompare(right.id, 'en'),
    );
    return { product, movements };
  }

  async listMovementsByPeriod(start: Date, end: Date): Promise<Movement[]> {
    return this.deps.store.repositories.movements.listByPeriod(start, end);
  }

  async getDashboard(): Promise<Dashboard> {
    const end = this.clock();
    const start = new Date(end.getTime());
    start.setUTCDate(start.getUTCDate() - 6);
    const repositories = this.deps.store.repositories;
    const [products, movements] = await Promise.all([
      repositories.products.list({ activeOnly: true }),
      repositories.movements.listByPeriod(start, end),
    ]);
    const lowStockProducts = lowStockList(products);
    return {
      stockValueCents: totalStockValue(products),
      activeProductCount: products.length,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      movementSummary: movementSummary(movements, start, end),
    };
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
