import { describe, expect, it } from 'vitest';
import { ProductNotFoundError } from '../../../src/domain/errors.js';
import { createTestInventory, TEST_NOW } from '../../inventoryHelpers.js';
import { validProductData } from '../domain/builders.js';

describe('consultas do InventoryService', () => {
  it('deve retornar lista vazia quando não existem produtos', async () => {
    expect(await createTestInventory().inventory.listProducts()).toEqual([]);
  });

  it('deve aplicar os filtros de produtos na consulta', async () => {
    const { inventory } = createTestInventory();
    const active = await inventory.createProduct(validProductData());
    const inactive = await inventory.createProduct(validProductData({ sku: 'INA-001' }));
    await inventory.deactivateProduct(inactive.id);

    expect(await inventory.listProducts({ activeOnly: true, search: 'caf' })).toEqual([active]);
  });

  it('deve retornar produto com histórico vazio quando não houve movimentação', async () => {
    const { inventory } = createTestInventory();
    const product = await inventory.createProduct(validProductData());

    expect(await inventory.getProductHistory(product.id)).toEqual({ product, movements: [] });
  });

  it('deve retornar o histórico mais recente primeiro e somente do produto solicitado', async () => {
    let now = new Date('2026-01-20T10:00:00Z');
    const { inventory } = createTestInventory(() => new Date(now.getTime()));
    const product = await inventory.createProduct(validProductData());
    const other = await inventory.createProduct(validProductData({ sku: 'OUT-001' }));
    const first = await inventory.registerMovement(product.id, 'ENTRADA', 10);
    await inventory.registerMovement(other.id, 'ENTRADA', 20);
    now = new Date('2026-01-21T10:00:00Z');
    const last = await inventory.registerMovement(product.id, 'SAIDA', 2);

    expect((await inventory.getProductHistory(product.id)).movements).toEqual([
      last.movement,
      first.movement,
    ]);
  });

  it('deve manter o histórico acessível depois da desativação do produto', async () => {
    const { inventory } = createTestInventory();
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 1);
    await inventory.deactivateProduct(product.id);

    const history = await inventory.getProductHistory(product.id);

    expect(history.product.active).toBe(false);
    expect(history.movements).toHaveLength(1);
  });

  it('deve rejeitar consulta de histórico de produto inexistente', async () => {
    await expect(createTestInventory().inventory.getProductHistory('ausente')).rejects.toThrow(
      ProductNotFoundError,
    );
  });

  it('deve consultar somente as movimentações do período solicitado', async () => {
    let now = new Date('2026-01-14T10:00:00Z');
    const { inventory } = createTestInventory(() => new Date(now.getTime()));
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 10);
    now = new Date(TEST_NOW);
    const recent = await inventory.registerMovement(product.id, 'SAIDA', 1);

    expect(
      await inventory.listMovementsByPeriod(new Date('2026-01-21'), new Date('2026-01-21')),
    ).toEqual([recent.movement]);
  });
});

describe('InventoryService.getDashboard', () => {
  it('deve apresentar um painel vazio com sete dias completos', async () => {
    const dashboard = await createTestInventory().inventory.getDashboard();

    expect(dashboard).toMatchObject({
      stockValueCents: 0,
      activeProductCount: 0,
      lowStockCount: 0,
      lowStockProducts: [],
    });
    expect(dashboard.movementSummary).toMatchObject({ totalEntries: 0, totalExits: 0 });
    expect(dashboard.movementSummary.daily).toHaveLength(7);
    expect(dashboard.movementSummary.daily[0]?.date).toBe('2026-01-15');
    expect(dashboard.movementSummary.daily[6]?.date).toBe('2026-01-21');
  });

  it('deve calcular valor, contagem e estoque baixo somente dos produtos ativos', async () => {
    const { inventory } = createTestInventory();
    const first = await inventory.createProduct(validProductData({ costCents: 100 }));
    const low = await inventory.createProduct(validProductData({ sku: 'BAI-001', costCents: 200 }));
    const inactive = await inventory.createProduct(
      validProductData({ sku: 'INA-001', costCents: 999 }),
    );
    await inventory.registerMovement(first.id, 'ENTRADA', 10);
    const lowEntry = await inventory.registerMovement(low.id, 'ENTRADA', 2);
    await inventory.registerMovement(inactive.id, 'ENTRADA', 100);
    await inventory.deactivateProduct(inactive.id);

    const dashboard = await inventory.getDashboard();

    expect(dashboard).toMatchObject({
      stockValueCents: 1400,
      activeProductCount: 2,
      lowStockCount: 1,
      lowStockProducts: [lowEntry.product],
    });
    expect(dashboard.movementSummary.totalEntries).toBe(112);
  });

  it('deve restringir o gráfico aos sete dias terminados na data do relógio', async () => {
    let now = new Date('2026-01-14T10:00:00Z');
    const { inventory } = createTestInventory(() => new Date(now.getTime()));
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 5);
    now = new Date('2026-01-15T10:00:00Z');
    await inventory.registerMovement(product.id, 'ENTRADA', 2);
    now = new Date(TEST_NOW);
    await inventory.registerMovement(product.id, 'SAIDA', 1);

    const dashboard = await inventory.getDashboard();

    expect(dashboard.movementSummary).toMatchObject({ totalEntries: 2, totalExits: 1 });
    expect(dashboard.movementSummary.daily[0]).toEqual({
      date: '2026-01-15',
      entries: 2,
      exits: 0,
      balance: 2,
    });
    expect(dashboard.movementSummary.daily[6]).toEqual({
      date: '2026-01-21',
      entries: 0,
      exits: 1,
      balance: -1,
    });
  });
});
