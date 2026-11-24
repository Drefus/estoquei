import { describe, expect, it } from 'vitest';
import { SAMPLE_PRODUCTS, seedInventory } from '../../../src/db/seed.js';
import { createTestInventory } from '../../inventoryHelpers.js';
import { validProductData } from '../domain/builders.js';

describe('seedInventory', () => {
  it('deve cadastrar todos os produtos de exemplo em um estoque vazio', async () => {
    const { inventory } = createTestInventory();

    const created = await seedInventory(inventory);

    expect(created).toEqual(SAMPLE_PRODUCTS.map((sample) => sample.sku));
    expect(await inventory.listProducts()).toHaveLength(SAMPLE_PRODUCTS.length);
  });

  it('deve aplicar as movimentações para chegar ao saldo de demonstração', async () => {
    const { inventory } = createTestInventory();

    await seedInventory(inventory);

    const [coffee] = await inventory.listProducts({ search: 'CAF-500' });
    expect(coffee?.quantity).toBe(28);
  });

  it('deve deixar produtos com estoque baixo para o painel', async () => {
    const { inventory } = createTestInventory();

    await seedInventory(inventory);

    expect((await inventory.getDashboard()).lowStockCount).toBeGreaterThan(0);
  });

  it('deve poder rodar de novo sem duplicar produtos', async () => {
    const { inventory } = createTestInventory();
    await seedInventory(inventory);

    const createdAgain = await seedInventory(inventory);

    expect(createdAgain).toEqual([]);
    expect(await inventory.listProducts()).toHaveLength(SAMPLE_PRODUCTS.length);
  });

  it('deve preservar produto já cadastrado com o mesmo SKU', async () => {
    const { inventory } = createTestInventory();
    await inventory.createProduct(validProductData({ sku: 'CAF-500', name: 'Meu café' }));

    const created = await seedInventory(inventory);

    expect(created).not.toContain('CAF-500');
    const [coffee] = await inventory.listProducts({ search: 'CAF-500' });
    expect(coffee).toMatchObject({ name: 'Meu café', quantity: 0 });
  });
});
