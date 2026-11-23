import { DuplicateSkuError, ProductNotFoundError } from '../domain/errors.js';
import type { Product } from '../domain/product.js';
import { isLowStock } from '../domain/stock.js';
import type { ProductFilters, ProductRepository } from './productRepository.js';

export class InMemoryProductRepository implements ProductRepository {
  private readonly products = new Map<string, Product>();

  /** Cria um estado independente para uma transação em memória. */
  clone(): InMemoryProductRepository {
    const copy = new InMemoryProductRepository();
    for (const [id, product] of this.products) copy.products.set(id, structuredClone(product));
    return copy;
  }

  async save(product: Product): Promise<void> {
    if (this.products.has(product.id)) {
      throw new Error(`Produto ${product.id} já cadastrado.`);
    }
    this.assertUniqueSku(product);
    this.products.set(product.id, structuredClone(product));
  }

  async update(product: Product): Promise<void> {
    if (!this.products.has(product.id)) throw new ProductNotFoundError(product.id);
    this.assertUniqueSku(product);
    this.products.set(product.id, structuredClone(product));
  }

  async findById(id: string): Promise<Product | null> {
    const product = this.products.get(id);
    return product ? structuredClone(product) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const product = [...this.products.values()].find((candidate) => candidate.sku === sku);
    return product ? structuredClone(product) : null;
  }

  async list(filters: ProductFilters = {}): Promise<Product[]> {
    const search = filters.search?.trim().toLowerCase();
    const category = filters.category?.trim();

    return [...this.products.values()]
      .filter((product) => {
        if (
          search &&
          !product.name.toLowerCase().includes(search) &&
          !product.sku.toLowerCase().includes(search)
        ) {
          return false;
        }
        if (category && product.category !== category) return false;
        if (filters.lowStockOnly && !isLowStock(product)) return false;
        if (filters.activeOnly && !product.active) return false;
        return true;
      })
      .map((product) => structuredClone(product));
  }

  private assertUniqueSku(product: Product): void {
    for (const existing of this.products.values()) {
      if (existing.sku === product.sku && existing.id !== product.id) {
        throw new DuplicateSkuError(product.sku);
      }
    }
  }
}
