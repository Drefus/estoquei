/**
 * Testes de integração do adaptador PostgreSQL.
 * Rodam somente com TEST_DATABASE_URL definida (ex.: um Postgres local em Docker),
 * pois apagam os dados das tabelas. O CI usa STORAGE=memory e os ignora.
 */
import type pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { migrate } from '../../src/db/migrate.js';
import { createPool } from '../../src/db/pool.js';
import { DuplicateSkuError, InsufficientStockError } from '../../src/domain/errors.js';
import type { Product } from '../../src/domain/product.js';
import { PostgresInventoryStore } from '../../src/repositories/postgres/postgresInventoryStore.js';
import { InventoryService } from '../../src/services/inventoryService.js';

const databaseUrl = process.env.TEST_DATABASE_URL;

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p-1',
    sku: 'CAN-001',
    name: 'Caneta azul',
    category: 'Papelaria',
    costCents: 150,
    minStock: 5,
    quantity: 10,
    active: true,
    createdAt: new Date('2026-01-10T12:00:00.000Z'),
    ...overrides,
  };
}

describe.skipIf(!databaseUrl)('PostgresInventoryStore (integração)', () => {
  let pool: pg.Pool;
  let store: PostgresInventoryStore;

  beforeAll(async () => {
    pool = createPool(databaseUrl!);
    await migrate(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE movements, products');
    store = new PostgresInventoryStore(pool);
  });

  it('deve aplicar as migrações uma única vez', async () => {
    expect(await migrate(pool)).toEqual([]);
  });

  it('deve salvar e recuperar um produto por id e por SKU', async () => {
    await store.repositories.products.save(product());

    expect(await store.repositories.products.findById('p-1')).toEqual(product());
    expect(await store.repositories.products.findBySku('CAN-001')).toEqual(product());
  });

  it('deve rejeitar SKU duplicado com erro de domínio', async () => {
    await store.repositories.products.save(product());

    await expect(store.repositories.products.save(product({ id: 'p-2' }))).rejects.toBeInstanceOf(
      DuplicateSkuError,
    );
  });

  it('deve filtrar por busca, categoria, estoque baixo e ativos', async () => {
    const { products } = store.repositories;
    await products.save(product());
    await products.save(product({ id: 'p-2', sku: 'LAP-001', name: 'Lápis 50%', quantity: 2 }));
    await products.save(
      product({ id: 'p-3', sku: 'CAD-001', name: 'Caderno', category: 'Escola', active: false }),
    );

    const ids = async (filters: Parameters<typeof products.list>[0]) =>
      (await products.list(filters)).map((item) => item.id).sort();

    expect(await ids({ search: 'can' })).toEqual(['p-1']);
    expect(await ids({ search: '50%' })).toEqual(['p-2']);
    expect(await ids({ category: ' Escola ' })).toEqual(['p-3']);
    expect(await ids({ lowStockOnly: true })).toEqual(['p-2']);
    expect(await ids({ activeOnly: true })).toEqual(['p-1', 'p-2']);
  });

  it('deve listar movimentações por dias completos em UTC', async () => {
    const service = new InventoryService({
      store,
      clock: () => new Date('2026-01-15T23:59:00.000Z'),
    });
    const created = await service.createProduct({
      sku: 'CAN-001',
      name: 'Caneta',
      category: '',
      costCents: 100,
      minStock: 0,
    });
    await service.registerMovement(created.id, 'ENTRADA', 4);

    const inside = await store.repositories.movements.listByPeriod(
      new Date('2026-01-15T00:00:00.000Z'),
      new Date('2026-01-15T00:00:00.000Z'),
    );
    const outside = await store.repositories.movements.listByPeriod(
      new Date('2026-01-16T00:00:00.000Z'),
      new Date('2026-01-17T00:00:00.000Z'),
    );

    expect(inside).toHaveLength(1);
    expect(outside).toEqual([]);
  });

  it('deve desfazer a transação quando a movimentação é rejeitada', async () => {
    const service = new InventoryService({ store });
    const created = await service.createProduct({
      sku: 'CAN-001',
      name: 'Caneta',
      category: '',
      costCents: 100,
      minStock: 0,
    });

    await expect(service.registerMovement(created.id, 'SAIDA', 1)).rejects.toBeInstanceOf(
      InsufficientStockError,
    );
    expect(await store.repositories.movements.listByProduct(created.id)).toEqual([]);
  });

  it('deve preservar todas as entradas registradas ao mesmo tempo', async () => {
    const service = new InventoryService({ store });
    const created = await service.createProduct({
      sku: 'CAN-001',
      name: 'Caneta',
      category: '',
      costCents: 100,
      minStock: 0,
    });

    await Promise.all(
      Array.from({ length: 10 }, () => service.registerMovement(created.id, 'ENTRADA', 1)),
    );

    expect((await store.repositories.products.findById(created.id))?.quantity).toBe(10);
  });
});
