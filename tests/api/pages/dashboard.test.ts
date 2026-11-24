import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { validProductData } from '../../unit/domain/builders.js';
import { createApiFixture } from '../helpers.js';

describe('página do painel', () => {
  it('deve exibir os cartões zerados quando não há produtos', async () => {
    const { app } = createApiFixture();

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('data-testid="total-value">R$ 0,00');
    expect(response.text).toContain('data-testid="active-products">0');
    expect(response.text).toContain('data-testid="no-low-stock"');
  });

  it('deve mostrar valor total, ativos e produtos com estoque baixo', async () => {
    const { app, inventory } = createApiFixture();
    const coffee = await inventory.createProduct(
      validProductData({ sku: 'CAF-500', costCents: 1000, minStock: 2 }),
    );
    await inventory.registerMovement(coffee.id, 'ENTRADA', 10);
    await inventory.createProduct(validProductData({ sku: 'DET-001', minStock: 3 }));

    const response = await request(app).get('/');

    expect(response.text).toContain('data-testid="total-value">R$ 100,00');
    expect(response.text).toContain('data-testid="active-products">2');
    expect(response.text).toContain('data-testid="low-stock-count">1');
    expect(response.text).toContain('data-testid="low-stock-row" data-sku="DET-001"');
    expect(response.text).not.toContain('data-sku="CAF-500"');
  });

  it('deve embutir as séries dos últimos 7 dias para o gráfico', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 8);
    await inventory.registerMovement(product.id, 'SAIDA', 3);

    const response = await request(app).get('/');
    const json = /<script type="application\/json" id="dados-grafico">(.*?)<\/script>/s.exec(
      response.text,
    )?.[1];
    const chart = JSON.parse(json ?? '{}');

    expect(chart.labels).toHaveLength(7);
    expect(chart.labels.at(-1)).toBe('21/01');
    expect(chart.entries.at(-1)).toBe(8);
    expect(chart.exits.at(-1)).toBe(3);
    expect(response.text).toContain('data-testid="period-entries">8');
  });

  it('deve servir o script do gráfico', async () => {
    const { app } = createApiFixture();

    const response = await request(app).get('/js/dashboard-chart.js');

    expect(response.status).toBe(200);
    expect(response.type).toMatch(/javascript/);
  });
});

describe('exportação CSV pelo painel', () => {
  it('deve sugerir os últimos 7 dias como período do CSV', async () => {
    const { app } = createApiFixture();

    const response = await request(app).get('/');

    expect(response.text).toContain('action="/api/reports/movements.csv"');
    expect(response.text).toMatch(/name="inicio"[^>]*value="2026-01-15"/);
    expect(response.text).toMatch(/name="fim"[^>]*value="2026-01-21"/);
  });

  it('deve baixar o CSV com os campos enviados pelo formulário', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 4);

    const response = await request(app)
      .get('/api/reports/movements.csv')
      .query({ inicio: '2026-01-15', fim: '2026-01-21' });

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.text).toContain('ENTRADA');
  });
});
