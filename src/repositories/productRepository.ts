import type { Product } from '../domain/product.js';

export interface ProductFilters {
  /** Busca parcial por nome ou SKU, sem diferenciar maiúsculas e minúsculas. */
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
  activeOnly?: boolean;
}

export interface ProductRepository {
  /** Cadastra um produto novo; rejeita id ou SKU já existente. */
  save(product: Product): Promise<void>;
  /** Atualiza um produto existente, preservando a unicidade do SKU. */
  update(product: Product): Promise<void>;
  findById(id: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  /** Sem filtros, inclui produtos ativos e inativos. Não garante ordem. */
  list(filters?: ProductFilters): Promise<Product[]>;
}
