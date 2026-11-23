import { describe, expect, it, vi } from 'vitest';
import {
  InactiveProductError,
  InsufficientStockError,
  InvalidMovementError,
  ProductNotFoundError,
} from '../../../src/domain/errors.js';
import type { InventoryStore } from '../../../src/repositories/inventoryStore.js';
import { InventoryService } from '../../../src/services/inventoryService.js';
import { createTestInventory, TEST_NOW } from '../../inventoryHelpers.js';
import { validProductData } from '../domain/builders.js';

describe('InventoryService.registerMovement', () => {
  it('deve registrar uma entrada e atualizar o saldo na mesma operação', async () => {
    const { store, inventory } = createTestInventory();
    const product = await inventory.createProduct(validProductData());

    const result = await inventory.registerMovement(product.id, 'ENTRADA', 10, '  Compra  ');

    expect(result.product.quantity).toBe(10);
    expect(result.movement).toMatchObject({
      productId: product.id,
      type: 'ENTRADA',
      quantity: 10,
      reason: 'Compra',
      date: new Date(TEST_NOW),
    });
    expect((await store.repositories.products.findById(product.id))?.quantity).toBe(10);
    expect(await store.repositories.movements.listByProduct(product.id)).toEqual([result.movement]);
  });

  it('deve descontar uma saída do saldo disponível', async () => {
    const { inventory } = createTestInventory();
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 10);

    expect((await inventory.registerMovement(product.id, 'SAIDA', 4)).product.quantity).toBe(6);
  });

  it('deve permitir uma saída que zera o estoque', async () => {
    const { inventory } = createTestInventory();
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 5);

    expect((await inventory.registerMovement(product.id, 'SAIDA', 5)).product.quantity).toBe(0);
  });

  it('deve substituir o saldo por um ajuste de inventário com motivo', async () => {
    const { inventory } = createTestInventory();
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 10);

    expect(
      (await inventory.registerMovement(product.id, 'AJUSTE', 3, 'Contagem')).product.quantity,
    ).toBe(3);
  });

  it('deve rejeitar saída insuficiente preservando saldo e histórico', async () => {
    const { store, inventory } = createTestInventory();
    const product = await inventory.createProduct(validProductData());
    const entry = await inventory.registerMovement(product.id, 'ENTRADA', 5);

    await expect(inventory.registerMovement(product.id, 'SAIDA', 6)).rejects.toThrow(
      InsufficientStockError,
    );

    expect((await store.repositories.products.findById(product.id))?.quantity).toBe(5);
    expect(await store.repositories.movements.listByProduct(product.id)).toEqual([entry.movement]);
  });

  it('deve impedir movimentação em produto inativo', async () => {
    const { store, inventory } = createTestInventory();
    const product = await inventory.createProduct(validProductData());
    await inventory.deactivateProduct(product.id);

    await expect(inventory.registerMovement(product.id, 'ENTRADA', 1)).rejects.toThrow(
      InactiveProductError,
    );
    expect(await store.repositories.movements.listByProduct(product.id)).toEqual([]);
  });

  it('deve rejeitar quantidade fracionária sem alterar o estoque', async () => {
    const { store, inventory } = createTestInventory();
    const product = await inventory.createProduct(validProductData());

    await expect(inventory.registerMovement(product.id, 'ENTRADA', 1.5)).rejects.toThrow(
      InvalidMovementError,
    );
    expect((await store.repositories.products.findById(product.id))?.quantity).toBe(0);
    expect(await store.repositories.movements.listByProduct(product.id)).toEqual([]);
  });

  it('deve exigir um motivo ao ajustar o inventário', async () => {
    const { inventory } = createTestInventory();
    const product = await inventory.createProduct(validProductData());

    await expect(inventory.registerMovement(product.id, 'AJUSTE', 0)).rejects.toThrow(
      InvalidMovementError,
    );
  });

  it('deve rejeitar movimentação de produto inexistente', async () => {
    const { inventory } = createTestInventory();

    await expect(inventory.registerMovement('ausente', 'ENTRADA', 1)).rejects.toThrow(
      ProductNotFoundError,
    );
  });

  it('deve impedir que saídas concorrentes consumam mais que o saldo disponível', async () => {
    const { store, inventory } = createTestInventory();
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 5);

    const results = await Promise.allSettled([
      inventory.registerMovement(product.id, 'SAIDA', 4),
      inventory.registerMovement(product.id, 'SAIDA', 4),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect((await store.repositories.products.findById(product.id))?.quantity).toBe(1);
    expect(await store.repositories.movements.listByProduct(product.id)).toHaveLength(2);
  });

  it('deve desfazer a atualização do saldo se o registro da movimentação falhar', async () => {
    const { store, inventory } = createTestInventory();
    const product = await inventory.createProduct(validProductData());
    const entry = await inventory.registerMovement(product.id, 'ENTRADA', 5);
    const failingStore: InventoryStore = {
      get repositories() {
        return store.repositories;
      },
      transaction: (work) =>
        store.transaction(async (repositories) => {
          vi.spyOn(repositories.movements, 'save').mockRejectedValueOnce(
            new Error('falha ao salvar'),
          );
          return work(repositories);
        }),
    };
    const failingInventory = new InventoryService({ store: failingStore });

    await expect(failingInventory.registerMovement(product.id, 'SAIDA', 2)).rejects.toThrow(
      'falha ao salvar',
    );

    expect((await store.repositories.products.findById(product.id))?.quantity).toBe(5);
    expect(await store.repositories.movements.listByProduct(product.id)).toEqual([entry.movement]);
  });
});
