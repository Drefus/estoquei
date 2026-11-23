import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { validProductData } from '../unit/domain/builders.js';
import { createApiFixture } from './helpers.js';

describe('exportação CSV de movimentações', () => {
  it('deve disponibilizar arquivo CSV com nome, tipo e cabeçalho apropriados', async () => {
    const response = await request(createApiFixture().app).get(
      '/api/reports/movements.csv?inicio=2026-01-21&fim=2026-01-21',
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain(
      'movimentacoes-2026-01-21-2026-01-21.csv',
    );
    expect(response.text).toBe('id,produtoId,tipo,quantidade,motivo,data\r\n');
  });

  it('deve exportar somente movimentações dos dias selecionados', async () => {
    let now = new Date('2026-01-20T10:00:00Z');
    const { app, inventory } = createApiFixture(() => new Date(now.getTime()));
    const product = await inventory.createProduct(validProductData());
    const before = await inventory.registerMovement(product.id, 'ENTRADA', 1);
    now = new Date('2026-01-21T23:59:59.999Z');
    const inside = await inventory.registerMovement(product.id, 'ENTRADA', 2);
    now = new Date('2026-01-22T00:00:00Z');
    const after = await inventory.registerMovement(product.id, 'ENTRADA', 3);

    const response = await request(app).get(
      '/api/reports/movements.csv?inicio=2026-01-21&fim=2026-01-21',
    );

    expect(response.text).toContain(`"${inside.movement.id}"`);
    expect(response.text).not.toContain(`"${before.movement.id}"`);
    expect(response.text).not.toContain(`"${after.movement.id}"`);
  });

  it('deve incluir ajustes no CSV mesmo que não componham entradas e saídas do gráfico', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'AJUSTE', 4, 'Inventário');

    const response = await request(app).get(
      '/api/reports/movements.csv?inicio=2026-01-21&fim=2026-01-21',
    );

    expect(response.text).toContain('"AJUSTE","4","Inventário"');
  });

  it('deve tratar possível fórmula na exportação sem alterar o histórico armazenado', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 1, '=1+1');

    const response = await request(app).get(
      '/api/reports/movements.csv?inicio=2026-01-21&fim=2026-01-21',
    );

    expect(response.text).toContain('"\t=1+1"');
    expect((await inventory.getProductHistory(product.id)).movements[0]?.reason).toBe('=1+1');
  });

  it.each(['', '?inicio=2026-01-22&fim=2026-01-21', '?inicio=2026-02-30&fim=2026-03-01'])(
    'deve responder 400 para período ausente ou inválido: %s',
    async (query) => {
      const response = await request(createApiFixture().app).get(
        `/api/reports/movements.csv${query}`,
      );
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    },
  );
});
