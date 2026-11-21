import { describe, expect, it } from 'vitest';
import {
  InactiveProductError,
  InsufficientStockError,
  InvalidMovementError,
} from '../../../src/domain/errors.js';
import { applyMovement } from '../../../src/domain/stock.js';
import { aMovement, aProduct } from './builders.js';

describe('applyMovement', () => {
  it('deve somar a quantidade ao saldo em uma entrada', () => {
    const product = aProduct({ quantity: 10 });

    const updated = applyMovement(product, aMovement({ type: 'ENTRADA', quantity: 5 }));

    expect(updated.quantity).toBe(15);
  });

  it('deve subtrair a quantidade do saldo em uma saída', () => {
    const product = aProduct({ quantity: 10 });

    const updated = applyMovement(product, aMovement({ type: 'SAIDA', quantity: 4 }));

    expect(updated.quantity).toBe(6);
  });

  it('deve definir o saldo absoluto em um ajuste', () => {
    const product = aProduct({ quantity: 10 });
    const ajuste = aMovement({ type: 'AJUSTE', quantity: 3, reason: 'Inventário mensal' });

    expect(applyMovement(product, ajuste).quantity).toBe(3);
  });

  it('deve manter os demais dados do produto inalterados', () => {
    const product = aProduct({ quantity: 10 });

    const updated = applyMovement(product, aMovement({ type: 'ENTRADA', quantity: 1 }));

    expect(updated).toEqual({ ...product, quantity: 11 });
  });

  it('não deve alterar o produto original', () => {
    const product = aProduct({ quantity: 10 });

    applyMovement(product, aMovement({ type: 'SAIDA', quantity: 4 }));

    expect(product.quantity).toBe(10);
  });

  it('deve rejeitar movimentação de outro produto', () => {
    const product = aProduct({ id: 'prod-1' });

    expect(() => applyMovement(product, aMovement({ productId: 'prod-2' }))).toThrow(
      InvalidMovementError,
    );
  });

  it('deve rejeitar movimentação com quantidade inválida', () => {
    const product = aProduct();

    expect(() => applyMovement(product, aMovement({ quantity: 0.5 }))).toThrow(
      InvalidMovementError,
    );
  });
});

describe('applyMovement com saldo insuficiente', () => {
  it('deve impedir saída maior que o saldo disponível', () => {
    const product = aProduct({ quantity: 3 });

    expect(() => applyMovement(product, aMovement({ type: 'SAIDA', quantity: 4 }))).toThrow(
      InsufficientStockError,
    );
  });

  it('deve permitir saída que deixa o saldo exatamente zero', () => {
    const product = aProduct({ quantity: 3 });

    const updated = applyMovement(product, aMovement({ type: 'SAIDA', quantity: 3 }));

    expect(updated.quantity).toBe(0);
  });

  it('deve impedir qualquer saída quando o saldo é zero', () => {
    const product = aProduct({ quantity: 0 });

    expect(() => applyMovement(product, aMovement({ type: 'SAIDA', quantity: 1 }))).toThrow(
      InsufficientStockError,
    );
  });
});

describe('applyMovement em produto inativo', () => {
  it.each([
    aMovement({ type: 'ENTRADA', quantity: 1 }),
    aMovement({ type: 'SAIDA', quantity: 1 }),
    aMovement({ type: 'AJUSTE', quantity: 1, reason: 'Inventário' }),
  ])('deve impedir movimentação do tipo $type em produto inativo', (movement) => {
    const product = aProduct({ active: false, quantity: 10 });

    expect(() => applyMovement(product, movement)).toThrow(InactiveProductError);
  });
});
