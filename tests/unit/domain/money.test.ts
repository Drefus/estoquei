import { describe, expect, it } from 'vitest';
import { formatCents } from '../../../src/domain/money.js';

describe('formatCents', () => {
  it('deve formatar 1999 centavos como "R$ 19,99"', () => {
    expect(formatCents(1999)).toBe('R$ 19,99');
  });

  it('deve formatar zero como "R$ 0,00"', () => {
    expect(formatCents(0)).toBe('R$ 0,00');
  });

  it('deve completar com zero à esquerda os centavos menores que dez', () => {
    expect(formatCents(105)).toBe('R$ 1,05');
  });

  it('deve separar milhares com ponto', () => {
    expect(formatCents(123456789)).toBe('R$ 1.234.567,89');
  });

  it('deve formatar valores negativos com sinal antes do símbolo', () => {
    expect(formatCents(-250)).toBe('-R$ 2,50');
  });

  it('deve rejeitar valor fracionário em centavos', () => {
    expect(() => formatCents(10.5)).toThrow(RangeError);
  });
});
