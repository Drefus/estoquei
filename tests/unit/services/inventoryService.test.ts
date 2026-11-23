import { describe, expect, it } from 'vitest';
import { DuplicateSkuError, InvalidProductError } from '../../../src/domain/errors.js';
import { createTestInventory, TEST_NOW } from '../../inventoryHelpers.js';
import { validProductData } from '../domain/builders.js';

describe('InventoryService.createProduct', () => {
  it('deve cadastrar produto ativo sem saldo com identidade e data geradas pelo serviço', async () => {
    const { store, inventory } = createTestInventory();

    const product = await inventory.createProduct(validProductData());

    expect(product).toEqual({
      ...validProductData(),
      id: 'id-1',
      quantity: 0,
      active: true,
      createdAt: new Date(TEST_NOW),
    });
    expect(await store.repositories.products.findById(product.id)).toEqual(product);
  });

  it('deve rejeitar dados inválidos sem cadastrar o produto', async () => {
    const { store, inventory } = createTestInventory();

    await expect(inventory.createProduct(validProductData({ sku: 'inválido' }))).rejects.toThrow(
      InvalidProductError,
    );
    expect(await store.repositories.products.list()).toEqual([]);
  });

  it('deve impedir cadastro com SKU já utilizado', async () => {
    const { store, inventory } = createTestInventory();
    await inventory.createProduct(validProductData());

    await expect(inventory.createProduct(validProductData())).rejects.toThrow(DuplicateSkuError);
    expect(await store.repositories.products.list()).toHaveLength(1);
  });

  it('deve manter o SKU reservado mesmo quando o produto está inativo', async () => {
    const { store, inventory } = createTestInventory();
    const original = await inventory.createProduct(validProductData());
    await store.transaction(async ({ products }) =>
      products.update({ ...original, active: false }),
    );

    await expect(inventory.createProduct(validProductData())).rejects.toThrow(DuplicateSkuError);
  });

  it('deve permitir somente um cadastro quando duas requisições usam o mesmo SKU', async () => {
    const { store, inventory } = createTestInventory();

    const results = await Promise.allSettled([
      inventory.createProduct(validProductData()),
      inventory.createProduct(validProductData()),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(await store.repositories.products.list()).toHaveLength(1);
  });

  it('deve manter campos de identidade e estoque sob controle do serviço', async () => {
    const { inventory } = createTestInventory();
    const input = { ...validProductData(), id: 'forjado', quantity: 999, active: false };

    const product = await inventory.createProduct(input);

    expect(product).toMatchObject({ id: 'id-1', quantity: 0, active: true });
  });
});
