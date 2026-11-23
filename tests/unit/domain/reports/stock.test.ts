import { describe, expect, it } from 'vitest';
import { lowStockList, totalStockValue } from '../../../../src/domain/reports/stock.js';
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

describe('lowStockList', () => {
  it('deve retornar lista vazia quando não existem produtos', () => {
    expect(lowStockList([])).toEqual([]);
  });

  it('deve incluir produto com saldo abaixo do estoque mínimo', () => {
    const product = aProduct({ quantity: 2, minStock: 5 });

    expect(lowStockList([product])).toEqual([product]);
  });

  it('deve incluir produto com saldo exatamente igual ao estoque mínimo', () => {
    const product = aProduct({ quantity: 5, minStock: 5 });

    expect(lowStockList([product])).toEqual([product]);
  });

  it('deve desconsiderar produto com saldo acima do estoque mínimo', () => {
    expect(lowStockList([aProduct({ quantity: 6, minStock: 5 })])).toEqual([]);
  });

  it('deve desconsiderar produto inativo mesmo quando seu estoque está baixo', () => {
    expect(lowStockList([aProduct({ quantity: 1, minStock: 5, active: false })])).toEqual([]);
  });

  it('deve ordenar produtos pelo maior déficit em relação ao estoque mínimo', () => {
    const smallDeficit = aProduct({ id: 'pouco', sku: 'POU-001', quantity: 8, minStock: 10 });
    const largeDeficit = aProduct({ id: 'muito', sku: 'MUI-001', quantity: 2, minStock: 10 });
    const mediumDeficit = aProduct({ id: 'medio', sku: 'MED-001', quantity: 1, minStock: 5 });

    expect(lowStockList([smallDeficit, largeDeficit, mediumDeficit])).toEqual([
      largeDeficit,
      mediumDeficit,
      smallDeficit,
    ]);
  });

  it('deve desempatar produtos com o mesmo déficit pela ordem do SKU', () => {
    const firstSku = aProduct({ id: 'primeiro', sku: 'AAA-001', quantity: 1, minStock: 3 });
    const lastSku = aProduct({ id: 'ultimo', sku: 'ZZZ-001', quantity: 2, minStock: 4 });

    expect(lowStockList([lastSku, firstSku])).toEqual([firstSku, lastSku]);
  });

  it('deve preservar a ordem da lista original ao ordenar o relatório', () => {
    const smallDeficit = aProduct({ id: 'pouco', sku: 'POU-001', quantity: 8, minStock: 10 });
    const largeDeficit = aProduct({ id: 'muito', sku: 'MUI-001', quantity: 2, minStock: 10 });
    const products = Object.freeze([smallDeficit, largeDeficit]);

    expect(lowStockList(products)).toEqual([largeDeficit, smallDeficit]);
    expect(products).toEqual([smallDeficit, largeDeficit]);
  });
});
