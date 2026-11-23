import { describe, expect, it } from 'vitest';
import { totalStockValue } from '../../../../src/domain/reports/stock.js';
import { aProduct } from '../builders.js';

describe('totalStockValue', () => {
  it('deve retornar zero quando não existem produtos', () => {
    expect(totalStockValue([])).toBe(0);
  });

  it('deve somar quantidade vezes custo de cada produto ativo em centavos', () => {
    const products = [
      aProduct({ id: 'cafe', sku: 'CAF-500', quantity: 3, costCents: 1999 }),
      aProduct({ id: 'acucar', sku: 'ACU-1000', quantity: 2, costCents: 500 }),
    ];

    expect(totalStockValue(products)).toBe(6997);
  });

  it('deve desconsiderar produtos inativos mesmo quando possuem saldo', () => {
    const products = [
      aProduct({ id: 'ativo', sku: 'ATV-001', quantity: 2, costCents: 200 }),
      aProduct({ id: 'inativo', sku: 'INA-001', quantity: 50, costCents: 1000, active: false }),
    ];

    expect(totalStockValue(products)).toBe(400);
  });

  it('deve retornar zero para produto sem saldo em estoque', () => {
    expect(totalStockValue([aProduct({ quantity: 0, costCents: 1999 })])).toBe(0);
  });

  it('deve retornar zero para produto com custo gratuito', () => {
    expect(totalStockValue([aProduct({ quantity: 10, costCents: 0 })])).toBe(0);
  });
});
