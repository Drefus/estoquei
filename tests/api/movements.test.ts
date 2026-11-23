import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { validProductData } from '../unit/domain/builders.js';
import { createApiFixture } from './helpers.js';

describe('movimentações pela API', () => {
  it('deve registrar uma entrada com 201 e devolver o saldo atualizado', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());

    const response = await request(app)
      .post(`/api/products/${product.id}/movements`)
      .send({ type: 'ENTRADA', quantity: 10, reason: 'Compra' });

    expect(response.status).toBe(201);
    expect(response.body.product.quantity).toBe(10);
    expect(response.body.movement).toMatchObject({
      productId: product.id,
      type: 'ENTRADA',
      quantity: 10,
      reason: 'Compra',
    });
  });

  it('deve registrar uma saída reduzindo o saldo disponível', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    await request(app)
      .post(`/api/products/${product.id}/movements`)
      .send({ type: 'ENTRADA', quantity: 10 });

    const response = await request(app)
      .post(`/api/products/${product.id}/movements`)
      .send({ type: 'SAIDA', quantity: 4 });

    expect(response.status).toBe(201);
    expect(response.body.product.quantity).toBe(6);
  });

  it('deve aceitar ajuste de inventário para saldo zero com motivo', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 10);

    const response = await request(app)
      .post(`/api/products/${product.id}/movements`)
      .send({ type: 'AJUSTE', quantity: 0, reason: 'Inventário' });

    expect(response.status).toBe(201);
    expect(response.body.product.quantity).toBe(0);
  });

  it('deve responder 400 para quantidade inválida', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    const response = await request(app)
      .post(`/api/products/${product.id}/movements`)
      .send({ type: 'ENTRADA', quantity: 0 });
    expect(response.status).toBe(400);
  });

  it('deve responder 400 para tipo desconhecido', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    const response = await request(app)
      .post(`/api/products/${product.id}/movements`)
      .send({ type: 'OUTRO', quantity: 1 });
    expect(response.status).toBe(400);
  });

  it('deve responder 409 para saída insuficiente sem adicionar histórico', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 5);

    const response = await request(app)
      .post(`/api/products/${product.id}/movements`)
      .send({ type: 'SAIDA', quantity: 6 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
    const history = await request(app).get(`/api/products/${product.id}/movements`);
    expect(history.body.product.quantity).toBe(5);
    expect(history.body.movements).toHaveLength(1);
  });

  it('deve responder 409 para movimentação em produto inativo', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    await inventory.deactivateProduct(product.id);

    const response = await request(app)
      .post(`/api/products/${product.id}/movements`)
      .send({ type: 'ENTRADA', quantity: 1 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INACTIVE_PRODUCT');
  });

  it('deve responder 404 para movimentação de produto inexistente', async () => {
    const response = await request(createApiFixture().app)
      .post('/api/products/ausente/movements')
      .send({ type: 'ENTRADA', quantity: 1 });
    expect(response.status).toBe(404);
  });

  it('deve responder 400 ao ajustar inventário sem motivo', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    const response = await request(app)
      .post(`/api/products/${product.id}/movements`)
      .send({ type: 'AJUSTE', quantity: 1 });
    expect(response.status).toBe(400);
  });

  it('deve devolver produto e histórico na consulta de movimentações', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    const movement = await inventory.registerMovement(product.id, 'ENTRADA', 2);

    const response = await request(app).get(`/api/products/${product.id}/movements`);

    expect(response.status).toBe(200);
    expect(response.body.product.quantity).toBe(2);
    expect(response.body.movements[0].id).toBe(movement.movement.id);
  });

  it('deve responder 404 ao consultar histórico de produto inexistente', async () => {
    const response = await request(createApiFixture().app).get('/api/products/ausente/movements');
    expect(response.status).toBe(404);
  });

  it('deve impedir saldo negativo diante de duas saídas HTTP simultâneas', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 5);

    const responses = await Promise.all([
      request(app)
        .post(`/api/products/${product.id}/movements`)
        .send({ type: 'SAIDA', quantity: 4 }),
      request(app)
        .post(`/api/products/${product.id}/movements`)
        .send({ type: 'SAIDA', quantity: 4 }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const history = await request(app).get(`/api/products/${product.id}/movements`);
    expect(history.body.product.quantity).toBe(1);
    expect(history.body.movements).toHaveLength(2);
  });
});
