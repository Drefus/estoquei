import { describe, expect, it } from 'vitest';
import {
  parseProductBody,
  parseMovementBody,
  parseProductFilters,
  parseProductId,
  RequestValidationError,
} from '../../../src/http/validation.js';
import { validProductData } from '../domain/builders.js';

describe('validação das entradas HTTP', () => {
  it('deve aceitar os campos esperados para produto', () => {
    expect(parseProductBody(validProductData())).toEqual(validProductData());
  });

  it.each([undefined, null, [], 'texto'])(
    'deve rejeitar corpo que não é objeto JSON: %s',
    (body) => {
      expect(() => parseProductBody(body)).toThrow(RequestValidationError);
    },
  );

  it('deve impedir envio de campos de estoque no cadastro ou na edição', () => {
    expect(() => parseProductBody({ ...validProductData(), quantity: 10 })).toThrow(
      /Campos não permitidos/,
    );
  });

  it('deve rejeitar campo textual com tipo incorreto', () => {
    expect(() => parseProductBody({ ...validProductData(), name: null })).toThrow(
      /name deve ser texto/,
    );
  });

  it.each(['1999', Number.POSITIVE_INFINITY])(
    'deve rejeitar preço que não é número finito: %s',
    (costCents) => {
      expect(() => parseProductBody({ ...validProductData(), costCents })).toThrow(
        RequestValidationError,
      );
    },
  );

  it('deve aceitar movimentação sem motivo opcional', () => {
    expect(parseMovementBody({ type: 'ENTRADA', quantity: 2 })).toEqual({
      type: 'ENTRADA',
      quantity: 2,
      reason: '',
    });
  });

  it('deve preservar o motivo informado na movimentação', () => {
    expect(parseMovementBody({ type: 'AJUSTE', quantity: 0, reason: 'Inventário' }).reason).toBe(
      'Inventário',
    );
  });

  it('deve rejeitar tipo de movimentação desconhecido', () => {
    expect(() => parseMovementBody({ type: 'TRANSFERENCIA', quantity: 2 })).toThrow(
      RequestValidationError,
    );
  });

  it('deve interpretar filtros de texto e opções booleanas explícitas', () => {
    expect(
      parseProductFilters({
        search: 'CAF',
        category: 'Mercearia',
        activeOnly: 'true',
        lowStockOnly: 'false',
      }),
    ).toEqual({ search: 'CAF', category: 'Mercearia', activeOnly: true, lowStockOnly: false });
  });

  it('deve aceitar consulta sem filtros', () => {
    expect(parseProductFilters({})).toEqual({});
  });

  it('deve rejeitar opção booleana ambígua', () => {
    expect(() => parseProductFilters({ activeOnly: 'sim' })).toThrow(RequestValidationError);
  });

  it('deve rejeitar parâmetro de busca repetido em vez de convertê-lo para texto', () => {
    expect(() => parseProductFilters({ search: ['CAF', 'ACU'] })).toThrow(RequestValidationError);
  });

  it('deve rejeitar filtros desconhecidos', () => {
    expect(() => parseProductFilters({ inexistente: 'true' })).toThrow(RequestValidationError);
  });

  it('deve remover espaços do identificador de produto', () => {
    expect(parseProductId(' produto-1 ')).toBe('produto-1');
  });

  it.each([undefined, ' ', []])('deve rejeitar identificador ausente ou inválido: %s', (id) => {
    expect(() => parseProductId(id)).toThrow(RequestValidationError);
  });
});
