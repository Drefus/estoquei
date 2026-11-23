import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  InvalidProductError,
  InvalidMovementError,
  DuplicateSkuError,
  InsufficientStockError,
  InactiveProductError,
  ProductNotFoundError,
} from '../../src/domain/errors.js';
import { errorHandler } from '../../src/http/errorHandler.js';
import { createApp } from '../../src/app.js';
import { testConfig } from '../helpers.js';

function appWithError(error: Error) {
  const app = express();
  app.get('/erro', async () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

describe('erros HTTP', () => {
  it.each([
    [new InvalidProductError(['Nome inválido.']), 400, 'INVALID_PRODUCT'],
    [new InvalidMovementError(['Quantidade inválida.']), 400, 'INVALID_MOVEMENT'],
    [new ProductNotFoundError('ausente'), 404, 'PRODUCT_NOT_FOUND'],
    [new DuplicateSkuError('CAF-001'), 409, 'DUPLICATE_SKU'],
    [new InsufficientStockError(1, 2), 409, 'INSUFFICIENT_STOCK'],
    [new InactiveProductError('produto'), 409, 'INACTIVE_PRODUCT'],
  ] as const)('deve mapear %s para status %s', async (error, status, code) => {
    const response = await request(appWithError(error)).get('/erro');
    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(code);
  });

  it('deve retornar erro genérico sem expor detalhes de uma falha interna', async () => {
    const response = await request(appWithError(new Error('detalhe interno'))).get('/erro');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' },
    });
  });

  it('deve responder 400 para JSON malformado', async () => {
    const response = await request(createApp({ config: testConfig() }))
      .post('/api/products')
      .set('Content-Type', 'application/json')
      .send('{"sku":');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('deve responder 413 para corpo acima do limite configurado', async () => {
    const response = await request(createApp({ config: testConfig() }))
      .post('/api/products')
      .send({ name: 'a'.repeat(110_000) });
    expect(response.status).toBe(413);
  });

  it('deve responder 404 em JSON para rota desconhecida', async () => {
    const response = await request(createApp({ config: testConfig() })).get('/api/ausente');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
