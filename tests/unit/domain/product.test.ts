import { describe, expect, it } from 'vitest';
import { InvalidProductError } from '../../../src/domain/errors.js';
import { createProduct, validateProductData } from '../../../src/domain/product.js';
import { FIXED_DATE, validProductData } from './builders.js';

const meta = { id: 'prod-1', now: FIXED_DATE };

describe('createProduct', () => {
  it('deve criar produto ativo com saldo zero a partir de dados válidos', () => {
    const product = createProduct(validProductData(), meta);

    expect(product).toEqual({
      id: 'prod-1',
      sku: 'CAF-500',
      name: 'Café torrado 500g',
      category: 'Mercearia',
      costCents: 1999,
      minStock: 5,
      quantity: 0,
      active: true,
      createdAt: FIXED_DATE,
    });
  });

  it('deve lançar InvalidProductError quando os dados são inválidos', () => {
    expect(() => createProduct(validProductData({ sku: 'x' }), meta)).toThrow(InvalidProductError);
  });
});

describe('validação de SKU', () => {
  it.each(['ABC', 'CAF-500', 'A1B2C3D4E5F6G7H8I9J0'])('deve aceitar o SKU "%s"', (sku) => {
    expect(validateProductData(validProductData({ sku }))).toEqual([]);
  });

  it('deve rejeitar SKU com menos de 3 caracteres', () => {
    expect(validateProductData(validProductData({ sku: 'AB' }))).toHaveLength(1);
  });

  it('deve rejeitar SKU com mais de 20 caracteres', () => {
    expect(validateProductData(validProductData({ sku: 'A'.repeat(21) }))).toHaveLength(1);
  });

  it('deve rejeitar SKU com letras minúsculas', () => {
    expect(validateProductData(validProductData({ sku: 'caf-500' }))).toHaveLength(1);
  });

  it.each(['CAF 500', 'CAF_500', 'CAFÉ-1'])(
    'deve rejeitar SKU com caractere não permitido: "%s"',
    (sku) => {
      expect(validateProductData(validProductData({ sku }))).toHaveLength(1);
    },
  );
});
