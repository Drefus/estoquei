import { describe, expect, it } from 'vitest';
import { movementSummary } from '../../../../src/domain/reports/movements.js';
import { aMovement } from '../builders.js';

const start = new Date('2026-01-15T00:00:00.000Z');
const end = new Date('2026-01-17T00:00:00.000Z');

describe('movementSummary', () => {
  it('deve preencher com zeros todos os dias de um período sem movimentações', () => {
    expect(movementSummary([], start, end)).toEqual({
      totalEntries: 0,
      totalExits: 0,
      daily: [
        { date: '2026-01-15', entries: 0, exits: 0, balance: 0 },
        { date: '2026-01-16', entries: 0, exits: 0, balance: 0 },
        { date: '2026-01-17', entries: 0, exits: 0, balance: 0 },
      ],
    });
  });

  it('deve somar as quantidades de entradas e saídas realizadas no mesmo dia', () => {
    const movements = [
      aMovement({ id: 'entrada-1', type: 'ENTRADA', quantity: 5 }),
      aMovement({ id: 'entrada-2', type: 'ENTRADA', quantity: 3 }),
      aMovement({ id: 'saida', type: 'SAIDA', quantity: 2 }),
    ];

    expect(movementSummary(movements, start, start)).toEqual({
      totalEntries: 8,
      totalExits: 2,
      daily: [{ date: '2026-01-15', entries: 8, exits: 2, balance: 6 }],
    });
  });

  it('deve separar as movimentações por dia e manter os totais do período', () => {
    const movements = [
      aMovement({ type: 'ENTRADA', quantity: 10 }),
      aMovement({
        id: 'saida',
        type: 'SAIDA',
        quantity: 4,
        date: new Date('2026-01-17T10:00:00Z'),
      }),
    ];

    expect(movementSummary(movements, start, end)).toEqual({
      totalEntries: 10,
      totalExits: 4,
      daily: [
        { date: '2026-01-15', entries: 10, exits: 0, balance: 10 },
        { date: '2026-01-16', entries: 0, exits: 0, balance: 0 },
        { date: '2026-01-17', entries: 0, exits: 4, balance: -4 },
      ],
    });
  });

  it('deve incluir o primeiro e o último instante dos dias selecionados', () => {
    const movements = [
      aMovement({ id: 'inicio', quantity: 2, date: new Date('2026-01-15T00:00:00.000Z') }),
      aMovement({ id: 'fim', quantity: 3, date: new Date('2026-01-15T23:59:59.999Z') }),
    ];
    const afternoon = new Date('2026-01-15T15:00:00Z');

    expect(movementSummary(movements, afternoon, afternoon).totalEntries).toBe(5);
  });

  it('deve desconsiderar movimentações anteriores e posteriores ao período', () => {
    const movements = [
      aMovement({ id: 'antes', quantity: 10, date: new Date('2026-01-14T23:59:59.999Z') }),
      aMovement({ id: 'dentro', quantity: 2 }),
      aMovement({ id: 'depois', quantity: 20, date: new Date('2026-01-18T00:00:00.000Z') }),
    ];

    expect(movementSummary(movements, start, end).totalEntries).toBe(2);
  });

  it('deve desconsiderar o saldo absoluto de ajustes nos totais de entrada e saída', () => {
    const movements = [
      aMovement({ type: 'ENTRADA', quantity: 5 }),
      aMovement({ id: 'saida', type: 'SAIDA', quantity: 2 }),
      aMovement({ id: 'ajuste', type: 'AJUSTE', quantity: 100, reason: 'Inventário' }),
    ];

    expect(movementSummary(movements, start, start)).toEqual({
      totalEntries: 5,
      totalExits: 2,
      daily: [{ date: '2026-01-15', entries: 5, exits: 2, balance: 3 }],
    });
  });

  it('deve apresentar os dias em ordem cronológica mesmo com movimentos fora de ordem', () => {
    const movements = [
      aMovement({ id: 'ultimo', date: new Date('2026-01-17T10:00:00Z') }),
      aMovement({ id: 'primeiro', date: new Date('2026-01-15T10:00:00Z') }),
    ];

    expect(movementSummary(movements, start, end).daily.map((day) => day.date)).toEqual([
      '2026-01-15',
      '2026-01-16',
      '2026-01-17',
    ]);
  });

  it('deve incluir o dia 29 de fevereiro na passagem de mês de um ano bissexto', () => {
    const summary = movementSummary([], new Date('2028-02-28'), new Date('2028-03-01'));

    expect(summary.daily.map((day) => day.date)).toEqual([
      '2028-02-28',
      '2028-02-29',
      '2028-03-01',
    ]);
  });

  it('deve agrupar pelo dia UTC quando a data contém outro fuso horário', () => {
    const movement = aMovement({ quantity: 3, date: new Date('2026-01-15T23:30:00-03:00') });

    expect(movementSummary([movement], start, end).daily[1]).toEqual({
      date: '2026-01-16',
      entries: 3,
      exits: 0,
      balance: 3,
    });
  });

  it('deve rejeitar período cujo início é posterior ao fim', () => {
    expect(() => movementSummary([], end, start)).toThrow(RangeError);
  });

  it.each([
    [new Date('inválida'), end],
    [start, new Date('inválida')],
  ])('deve rejeitar período com data inválida: %s a %s', (first, last) => {
    expect(() => movementSummary([], first, last)).toThrow(RangeError);
  });

  it('deve preservar a lista de movimentações e as datas recebidas', () => {
    const movements = Object.freeze([aMovement()]);
    const original = structuredClone({ movements, start, end });

    movementSummary(movements, start, end);

    expect({ movements, start, end }).toEqual(original);
  });
});
