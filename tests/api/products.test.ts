import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { testConfig } from '../helpers.js';
import { TEST_NOW } from '../inventoryHelpers.js';
import { validProductData } from '../unit/domain/builders.js';
import { createApiFixture } from './helpers.js';

describe('cadastro e listagem de produtos pela API', () => {
  it('deve cadastrar produto com 201 e disponibilizá-lo na listagem', async () => {
    const { app } = createApiFixture();

    const response = await request(app)
      .post('/api/products')
      .send(validProductData({ name: '  Café  ' }));

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 'id-1',
      name: 'Café',
      quantity: 0,
      active: true,
      createdAt: TEST_NOW,
    });
    expect((await request(app).get('/api/products')).body).toEqual([response.body]);
  });

  it('deve responder 400 para produto que viola as regras de domínio', async () => {
    const { app } = createApiFixture();
    const response = await request(app)
      .post('/api/products')
      .send(validProductData({ costCents: -1 }));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PRODUCT');
  });

  it('deve responder 409 quando o SKU já está cadastrado', async () => {
    const { app } = createApiFixture();
    await request(app).post('/api/products').send(validProductData());

    const response = await request(app).post('/api/products').send(validProductData());

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DUPLICATE_SKU');
  });

  it('deve rejeitar corpo sem os tipos de campos esperados', async () => {
    const { app } = createApiFixture();
    const response = await request(app)
      .post('/api/products')
      .send(validProductData({ name: null as unknown as string }));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_REQUEST');
  });

  it('deve rejeitar campos gerenciados pelo servidor no cadastro', async () => {
    const { app } = createApiFixture();
    const response = await request(app)
      .post('/api/products')
      .send({ ...validProductData(), id: 'forjado', quantity: 100 });
    expect(response.status).toBe(400);
    expect((await request(app).get('/api/products')).body).toEqual([]);
  });

  it('deve retornar lista vazia quando não há produtos', async () => {
    const response = await request(createApiFixture().app).get('/api/products');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('deve aceitar os filtros de busca, categoria, estoque baixo e ativos', async () => {
    const { app, inventory } = createApiFixture();
    const target = await inventory.createProduct(validProductData());
    await inventory.createProduct(
      validProductData({ sku: 'SAB-001', name: 'Sabão', category: 'Limpeza' }),
    );
    const inactive = await inventory.createProduct(validProductData({ sku: 'CAF-INA' }));
    await inventory.deactivateProduct(inactive.id);

    const response = await request(app)
      .get('/api/products')
      .query({ search: 'CAF', category: 'Mercearia', lowStockOnly: 'true', activeOnly: 'true' });

    expect(response.status).toBe(200);
    expect(response.body.map((product: { id: string }) => product.id)).toEqual([target.id]);
  });

  it('deve responder 400 para filtros inválidos', async () => {
    const response = await request(createApiFixture().app).get('/api/products?activeOnly=sim');
    expect(response.status).toBe(400);
  });

  it('deve compartilhar o serviço entre requisições concorrentes do mesmo aplicativo', async () => {
    const { app } = createApiFixture();

    const responses = await Promise.all([
      request(app).post('/api/products').send(validProductData()),
      request(app).post('/api/products').send(validProductData()),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
  });

  it('deve isolar o armazenamento de instâncias diferentes do aplicativo', async () => {
    const first = createApp({ config: testConfig() });
    const second = createApp({ config: testConfig() });
    expect((await request(first).post('/api/products').send(validProductData())).status).toBe(201);
    expect((await request(second).get('/api/products')).body).toEqual([]);
  });

  it('deve impedir uso silencioso de memória quando PostgreSQL foi solicitado', () => {
    expect(() =>
      createApp({
        config: testConfig({ storage: 'postgres', databaseUrl: 'postgres://localhost/test' }),
      }),
    ).toThrow(/PostgreSQL/);
  });
});
