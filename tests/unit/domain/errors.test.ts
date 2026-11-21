import { describe, expect, it } from 'vitest';
import {
  DomainError,
  DuplicateSkuError,
  InactiveProductError,
  InsufficientStockError,
  InvalidMovementError,
  InvalidProductError,
  ProductNotFoundError,
} from '../../../src/domain/errors.js';

describe('erros de domínio', () => {
  it.each([
    ['InvalidProductError', new InvalidProductError(['nome obrigatório'])],
    ['InvalidMovementError', new InvalidMovementError(['quantidade inválida'])],
    ['InsufficientStockError', new InsufficientStockError(1, 2)],
    ['InactiveProductError', new InactiveProductError('p1')],
    ['ProductNotFoundError', new ProductNotFoundError('p1')],
    ['DuplicateSkuError', new DuplicateSkuError('ABC-1')],
  ])('deve permitir identificar %s como erro de domínio pelo nome', (name, error) => {
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(name);
  });

  it('deve informar saldo disponível e quantidade solicitada no erro de estoque insuficiente', () => {
    const error = new InsufficientStockError(3, 5);

    expect(error.available).toBe(3);
    expect(error.requested).toBe(5);
    expect(error.message).toContain('3');
    expect(error.message).toContain('5');
  });

  it('deve listar os problemas encontrados no erro de produto inválido', () => {
    const error = new InvalidProductError(['SKU inválido.', 'Nome obrigatório.']);

    expect(error.issues).toEqual(['SKU inválido.', 'Nome obrigatório.']);
    expect(error.message).toContain('SKU inválido.');
  });
});
