import { describe, expect, it } from 'vitest';
import { InvalidMovementError } from '../../../src/domain/errors.js';
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
