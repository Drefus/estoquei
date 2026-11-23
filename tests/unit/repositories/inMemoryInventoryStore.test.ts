import { describe, expect, it } from 'vitest';
import { InMemoryInventoryStore } from '../../../src/repositories/inMemoryInventoryStore.js';
import { aMovement, aProduct } from '../domain/builders.js';

describe('InMemoryInventoryStore', () => {
  it('deve confirmar produto e movimentação juntos e retornar o resultado da operação', async () => {
    const store = new InMemoryInventoryStore();
    const product = aProduct();
    const movement = aMovement();

    const result = await store.transaction(async ({ products, movements }) => {
      await products.save(product);
      await movements.save(movement);
      return product.id;
    });

    expect(result).toBe(product.id);
    expect(await store.repositories.products.findById(product.id)).toEqual(product);
    expect(await store.repositories.movements.listByProduct(product.id)).toEqual([movement]);
  });

  it('deve desfazer alterações nos dois repositórios se a operação falhar', async () => {
    const store = new InMemoryInventoryStore();
    const product = aProduct({ quantity: 10 });
    await store.transaction(async ({ products }) => products.save(product));

    await expect(
      store.transaction(async ({ products, movements }) => {
        await products.update({ ...product, quantity: 20 });
        await movements.save(aMovement());
        throw new Error('falha simulada');
      }),
    ).rejects.toThrow('falha simulada');

    expect(await store.repositories.products.findById(product.id)).toEqual(product);
    expect(await store.repositories.movements.listByProduct(product.id)).toEqual([]);
  });

  it('deve permitir outra transação depois de uma falha', async () => {
    const store = new InMemoryInventoryStore();
    await expect(
      store.transaction(async () => {
        throw new Error('falha');
      }),
    ).rejects.toThrow('falha');

    await store.transaction(async ({ products }) => products.save(aProduct()));

    expect(await store.repositories.products.list()).toHaveLength(1);
  });

  it('deve serializar alterações concorrentes sem perder atualizações', async () => {
    const store = new InMemoryInventoryStore();
    const product = aProduct({ quantity: 0 });
    await store.transaction(async ({ products }) => products.save(product));
    const increment = () =>
      store.transaction(async ({ products }) => {
        const current = (await products.findById(product.id))!;
        await Promise.resolve();
        await products.update({ ...current, quantity: current.quantity + 1 });
      });

    await Promise.all([increment(), increment()]);

    expect((await store.repositories.products.findById(product.id))?.quantity).toBe(2);
  });

  it('deve manter as leituras no estado confirmado até o fim da transação', async () => {
    const store = new InMemoryInventoryStore();
    const product = aProduct();
    await store.transaction(async ({ products }) => products.save(product));
    const snapshot = store.repositories;

    await store.transaction(async ({ products }) => {
      await products.update({ ...product, quantity: 99 });
      expect(await store.repositories.products.findById(product.id)).toEqual(product);
    });

    expect((await store.repositories.products.findById(product.id))?.quantity).toBe(99);
    expect(await snapshot.products.findById(product.id)).toEqual(product);
  });

  it('deve preservar movimentações já confirmadas ao iniciar outra transação', async () => {
    const store = new InMemoryInventoryStore();
    const movement = aMovement();
    await store.transaction(async ({ movements }) => movements.save(movement));

    await store.transaction(async ({ products }) => products.save(aProduct()));

    expect(await store.repositories.movements.listByProduct(movement.productId)).toEqual([
      movement,
    ]);
  });
});
