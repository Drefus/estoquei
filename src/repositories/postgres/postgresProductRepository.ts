import type pg from 'pg';
import { DuplicateSkuError, ProductNotFoundError } from '../../domain/errors.js';
import type { Product } from '../../domain/product.js';
import type { ProductFilters, ProductRepository } from '../productRepository.js';
import { isUniqueViolation, type Queryable } from './queryable.js';

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  cost_cents: string | number;
  min_stock: number;
  quantity: number;
  active: boolean;
  created_at: Date;
}

const COLUMNS = 'id, sku, name, category, cost_cents, min_stock, quantity, active, created_at';

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    // BIGINT chega como texto no driver pg.
    costCents: Number(row.cost_cents),
    minStock: row.min_stock,
    quantity: row.quantity,
    active: row.active,
    createdAt: new Date(row.created_at),
  };
}

function productValues(product: Product): unknown[] {
  return [
    product.id,
    product.sku,
    product.name,
    product.category,
    product.costCents,
    product.minStock,
    product.quantity,
    product.active,
    product.createdAt,
  ];
}

export class PostgresProductRepository implements ProductRepository {
  constructor(private readonly db: Queryable) {}

  async save(product: Product): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO products (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        productValues(product),
      );
    } catch (error) {
      throw this.translate(error, product);
    }
  }

  async update(product: Product): Promise<void> {
    let result: pg.QueryResult;
    try {
      result = await this.db.query(
        `UPDATE products
            SET sku = $2, name = $3, category = $4, cost_cents = $5, min_stock = $6,
                quantity = $7, active = $8, created_at = $9
          WHERE id = $1`,
        productValues(product),
      );
    } catch (error) {
      throw this.translate(error, product);
    }
    if (result.rowCount === 0) throw new ProductNotFoundError(product.id);
  }

  async findById(id: string): Promise<Product | null> {
    return this.findOne('id', id);
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.findOne('sku', sku);
  }

  async list(filters: ProductFilters = {}): Promise<Product[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const search = filters.search?.trim().toLowerCase();
    const category = filters.category?.trim();

    if (search) {
      params.push(search);
      // strpos evita tratar % e _ digitados pelo usuário como curingas.
      conditions.push(
        `(strpos(lower(name), $${params.length}) > 0 OR strpos(lower(sku), $${params.length}) > 0)`,
      );
    }
    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    if (filters.lowStockOnly) conditions.push('quantity <= min_stock');
    if (filters.activeOnly) conditions.push('active');

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await this.db.query<ProductRow>(
      `SELECT ${COLUMNS} FROM products ${where} ORDER BY name, sku`,
      params,
    );
    return rows.map(toProduct);
  }

  private async findOne(column: 'id' | 'sku', value: string): Promise<Product | null> {
    const { rows } = await this.db.query<ProductRow>(
      `SELECT ${COLUMNS} FROM products WHERE ${column} = $1`,
      [value],
    );
    return rows[0] ? toProduct(rows[0]) : null;
  }

  private translate(error: unknown, product: Product): unknown {
    if (isUniqueViolation(error, 'products_sku_key')) return new DuplicateSkuError(product.sku);
    if (isUniqueViolation(error, 'products_pkey')) {
      return new Error(`Produto ${product.id} já cadastrado.`, { cause: error });
    }
    return error;
  }
}
