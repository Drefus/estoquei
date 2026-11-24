import { describe, expect, it } from 'vitest';
import {
  centsToInput,
  parseNumberField,
  parseReaisToCents,
  productDataFromForm,
  productFormFromProduct,
  productFormValues,
} from '../../../src/http/pages/forms.js';
import { aProduct } from '../domain/builders.js';

describe('parseReaisToCents', () => {
  it.each([
    ['19,99', 1999],
    ['19.99', 1999],
    ['19,9', 1990],
    ['19', 1900],
    ['R$ 5,00', 500],
    ['0', 0],
  ])('deve converter "%s" para %i centavos', (input, cents) => {
    expect(parseReaisToCents(input)).toBe(cents);
  });

  it('deve manter o sinal negativo para o domínio rejeitar o preço', () => {
    expect(parseReaisToCents('-1,50')).toBe(-150);
  });

  it.each(['', 'abc', '1,999', '1,2,3'])('deve retornar NaN para o texto inválido "%s"', (input) => {
    expect(parseReaisToCents(input)).toBeNaN();
  });
});

describe('centsToInput', () => {
  it('deve formatar centavos no padrão do campo de preço', () => {
    expect(centsToInput(1999)).toBe('19,99');
    expect(centsToInput(5)).toBe('0,05');
  });
});

describe('parseNumberField', () => {
  it('deve tratar campo vazio como inválido', () => {
    expect(parseNumberField('  ')).toBeNaN();
  });

  it('deve preservar a parte fracionária para o domínio rejeitar', () => {
    expect(parseNumberField('2,5')).toBe(2.5);
  });
});

describe('formulário de produto', () => {
  it('deve normalizar o SKU digitado em minúsculas', () => {
    expect(productFormValues({ sku: ' caf-500 ' }).sku).toBe('CAF-500');
  });

  it('deve tratar campos ausentes como texto vazio', () => {
    expect(productFormValues(undefined)).toEqual({
      sku: '',
      name: '',
      category: '',
      cost: '',
      minStock: '',
    });
  });

  it('deve converter os valores do formulário em dados do produto', () => {
    const values = productFormValues({
      sku: 'CAF-500',
      name: 'Café',
      category: 'Mercearia',
      cost: '19,99',
      minStock: '5',
    });

    expect(productDataFromForm(values)).toEqual({
      sku: 'CAF-500',
      name: 'Café',
      category: 'Mercearia',
      costCents: 1999,
      minStock: 5,
    });
  });

  it('deve preencher o formulário de edição a partir do produto', () => {
    expect(productFormFromProduct(aProduct())).toEqual({
      sku: 'CAF-500',
      name: 'Café torrado 500g',
      category: 'Mercearia',
      cost: '19,99',
      minStock: '5',
    });
  });
});
