import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { validProductData } from '../unit/domain/builders.js';
import { createApiFixture } from './helpers.js';

describe('painel pela API', () => {
  it('deve retornar painel vazio com sete dias no gráfico', async () => {
    const response = await request(createApiFixture().app).get('/api/dashboard');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      stockValueCents: 0,
      activeProductCount: 0,
      lowStockCount: 0,
      lowStockProducts: [],
    });
    expect(response.body.movementSummary.daily).toHaveLength(7);
  });

  it('deve refletir cadastro, entrada e saída feitos pela API nos indicadores do painel', async () => {
    const { app } = createApiFixture();
    const created = await request(app).post('/api/products').send(validProductData());
    const id = created.body.id as string;
    await request(app)
      .post(`/api/products/${id}/movements`)
      .send({ type: 'ENTRADA', quantity: 10 });
    await request(app).post(`/api/products/${id}/movements`).send({ type: 'SAIDA', quantity: 6 });

    const response = await request(app).get('/api/dashboard');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      stockValueCents: 7996,
      activeProductCount: 1,
      lowStockCount: 1,
    });
    expect(response.body.lowStockProducts[0]).toMatchObject({ id, quantity: 4 });
    expect(response.body.movementSummary).toMatchObject({ totalEntries: 10, totalExits: 6 });
  });

  it('deve excluir produto desativado dos indicadores e preservar suas movimentações no gráfico', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 2);
    await request(app).delete(`/api/products/${product.id}`);

    const response = await request(app).get('/api/dashboard');

    expect(response.body).toMatchObject({
      stockValueCents: 0,
      activeProductCount: 0,
      lowStockCount: 0,
    });
    expect(response.body.movementSummary.totalEntries).toBe(2);
  });
});
