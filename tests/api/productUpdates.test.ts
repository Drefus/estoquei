import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { validProductData } from '../unit/domain/builders.js';
import { createApiFixture } from './helpers.js';

describe('edição e desativação de produtos pela API', () => {
  it('deve editar os dados mantendo o saldo e os metadados do cadastro', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 10);

    const response = await request(app)
      .put(`/api/products/${product.id}`)
      .send(validProductData({ name: 'Novo nome', costCents: 2500 }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: product.id,
      name: 'Novo nome',
      costCents: 2500,
      quantity: 10,
      createdAt: product.createdAt.toISOString(),
    });
    expect((await request(app).get('/api/products')).body).toEqual([response.body]);
  });

  it('deve rejeitar alteração direta do saldo pelo endpoint de edição', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());

    const response = await request(app)
      .put(`/api/products/${product.id}`)
      .send({ ...validProductData(), quantity: 100 });

    expect(response.status).toBe(400);
    expect((await request(app).get('/api/products')).body[0].quantity).toBe(0);
  });

  it('deve responder 404 ao editar produto inexistente', async () => {
    const response = await request(createApiFixture().app)
      .put('/api/products/ausente')
      .send(validProductData());
    expect(response.status).toBe(404);
  });

  it('deve responder 409 ao editar para o SKU de outro produto', async () => {
    const { app, inventory } = createApiFixture();
    await inventory.createProduct(validProductData());
    const second = await inventory.createProduct(validProductData({ sku: 'SEG-001' }));

    const response = await request(app).put(`/api/products/${second.id}`).send(validProductData());

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DUPLICATE_SKU');
  });

  it('deve responder 400 quando os novos dados violam as regras do produto', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());

    const response = await request(app)
      .put(`/api/products/${product.id}`)
      .send(validProductData({ sku: 'minúsculo' }));

    expect(response.status).toBe(400);
  });

  it('deve desativar com 204 e manter o produto no cadastro', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());

    const response = await request(app).delete(`/api/products/${product.id}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect((await request(app).get('/api/products')).body[0].active).toBe(false);
    expect((await request(app).get('/api/products?activeOnly=true')).body).toEqual([]);
  });

  it('deve responder 404 ao desativar produto inexistente', async () => {
    const response = await request(createApiFixture().app).delete('/api/products/ausente');
    expect(response.status).toBe(404);
  });

  it('deve permitir repetir a desativação sem apagar o cadastro', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    await request(app).delete(`/api/products/${product.id}`);

    expect((await request(app).delete(`/api/products/${product.id}`)).status).toBe(204);
    expect((await request(app).get('/api/products')).body).toHaveLength(1);
  });

  it('deve rejeitar identificador em branco no caminho da requisição', async () => {
    const response = await request(createApiFixture().app).delete('/api/products/%20');
    expect(response.status).toBe(400);
  });
});
