import { describe, expect, it } from 'vitest';
import { parsePeriodQuery, RequestValidationError } from '../../../src/http/validation.js';

describe('parsePeriodQuery', () => {
  it('deve interpretar datas ISO como dias em UTC', () => {
    expect(parsePeriodQuery({ inicio: '2026-01-15', fim: '2026-01-21' })).toEqual({
      start: new Date('2026-01-15'),
      end: new Date('2026-01-21'),
    });
  });

  it.each([
    {},
    { inicio: '2026-01-15' },
    { inicio: '2026-01-15', fim: '2026-01-14' },
    { inicio: '2026-02-30', fim: '2026-03-01' },
    { inicio: '2026-13-01', fim: '2026-03-01' },
    { inicio: '15/01/2026', fim: '2026-01-21' },
    { inicio: ['2026-01-15'], fim: '2026-01-21' },
    { inicio: '2026-01-15', fim: '2026-01-21', extra: 'x' },
  ])('deve rejeitar período incompleto ou inválido: %j', (query) => {
    expect(() => parsePeriodQuery(query)).toThrow(RequestValidationError);
  });
});
