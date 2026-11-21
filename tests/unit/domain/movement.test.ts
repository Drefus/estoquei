import { describe, expect, it } from 'vitest';
import { InvalidMovementError } from '../../../src/domain/errors.js';
import {
  createMovement,
  validateMovementData,
  type MovementData,
  type MovementType,
} from '../../../src/domain/movement.js';
import { FIXED_DATE } from './builders.js';

const meta = { id: 'mov-1', now: FIXED_DATE };

function data(overrides: Partial<MovementData> = {}): MovementData {
  return { productId: 'prod-1', type: 'ENTRADA', quantity: 10, ...overrides };
}

describe('createMovement', () => {
  it('deve criar movimentação de entrada com os dados informados', () => {
    const movement = createMovement(data({ reason: 'Compra do fornecedor' }), meta);

    expect(movement).toEqual({
      id: 'mov-1',
      productId: 'prod-1',
      type: 'ENTRADA',
      quantity: 10,
      reason: 'Compra do fornecedor',
      date: FIXED_DATE,
    });
  });

  it('deve usar motivo vazio quando nenhum é informado em entrada ou saída', () => {
    expect(createMovement(data({ type: 'SAIDA' }), meta).reason).toBe('');
  });

  it('deve lançar InvalidMovementError quando os dados são inválidos', () => {
    expect(() => createMovement(data({ quantity: 0 }), meta)).toThrow(InvalidMovementError);
  });
});

describe('validação de quantidade em entrada e saída', () => {
  const types: MovementType[] = ['ENTRADA', 'SAIDA'];

  it.each(types)('deve aceitar quantidade 1 em %s', (type) => {
    expect(validateMovementData(data({ type, quantity: 1 }))).toEqual([]);
  });

  it.each(types)('deve rejeitar quantidade zero em %s', (type) => {
    expect(validateMovementData(data({ type, quantity: 0 }))).toHaveLength(1);
  });

  it.each(types)('deve rejeitar quantidade negativa em %s', (type) => {
    expect(validateMovementData(data({ type, quantity: -3 }))).toHaveLength(1);
  });

  it.each(types)('deve rejeitar quantidade fracionária em %s', (type) => {
    expect(validateMovementData(data({ type, quantity: 1.5 }))).toHaveLength(1);
  });
});

describe('validação de tipo e produto', () => {
  it('deve rejeitar tipo de movimentação desconhecido', () => {
    const issues = validateMovementData(data({ type: 'TRANSFERENCIA' as MovementType }));

    expect(issues).toEqual(['Tipo deve ser um de: ENTRADA, SAIDA, AJUSTE.']);
  });

  it('deve exigir o produto da movimentação', () => {
    expect(validateMovementData(data({ productId: ' ' }))).toEqual(['Produto é obrigatório.']);
  });
});
