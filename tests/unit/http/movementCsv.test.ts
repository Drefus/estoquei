import { describe, expect, it } from 'vitest';
import { movementCsv } from '../../../src/http/movementCsv.js';
import { aMovement } from '../domain/builders.js';

describe('movementCsv', () => {
  it('deve retornar somente o cabeçalho quando não há movimentações', () => {
    expect(movementCsv([])).toBe('id,produtoId,tipo,quantidade,motivo,data\r\n');
  });

  it('deve exportar os dados da movimentação com data ISO e fim de linha CRLF', () => {
    const movement = aMovement({ quantity: 10, reason: 'Compra' });

    expect(movementCsv([movement])).toBe(
      'id,produtoId,tipo,quantidade,motivo,data\r\n"mov-1","prod-1","ENTRADA","10","Compra","2026-01-15T12:00:00.000Z"\r\n',
    );
  });

  it('deve manter vírgulas do motivo dentro de uma única célula', () => {
    expect(movementCsv([aMovement({ reason: 'Compra, lote 1' })])).toContain('"Compra, lote 1"');
  });

  it('deve escapar aspas presentes no motivo', () => {
    expect(movementCsv([aMovement({ reason: 'Compra "especial"' })])).toContain(
      '"Compra ""especial"""',
    );
  });

  it('deve preservar quebras de linha dentro da célula entre aspas', () => {
    expect(movementCsv([aMovement({ reason: 'Compra\nFornecedor' })])).toContain(
      '"Compra\nFornecedor"',
    );
  });

  it.each(['=1+1', '+1+1', '-1+1', '@SUM(1)', '＝1+1', '  =1+1'])(
    'deve prefixar possível fórmula com tab dentro da célula: %s',
    (reason) => {
      expect(movementCsv([aMovement({ reason })])).toContain(`"\t${reason}"`);
    },
  );

  it('deve preservar o motivo original ao formatar a exportação', () => {
    const movement = aMovement({ reason: '=1+1' });

    movementCsv([movement]);

    expect(movement.reason).toBe('=1+1');
  });
});
