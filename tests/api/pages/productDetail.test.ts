import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { validProductData } from '../../unit/domain/builders.js';
import { createApiFixture } from '../helpers.js';

function quantityShown(html: string): number {
  const match = /data-testid="product-quantity">(\d+)</.exec(html);
  return Number(match?.[1]);
}

async function fixtureWithProduct(minStock = 5) {
  const fixture = createApiFixture();
  const product = await fixture.inventory.createProduct(validProductData({ minStock }));
  return { ...fixture, product, url: `/produtos/${product.id}` };
}

describe('página do produto', () => {
  it('deve exibir dados, saldo e histórico vazio de um produto novo', async () => {
    const { app, url } = await fixtureWithProduct();

    const response = await request(app).get(url);

    expect(response.status).toBe(200);
    expect(response.text).toContain('data-testid="product-detail-sku">CAF-500');
    expect(quantityShown(response.text)).toBe(0);
    expect(response.text).toContain('data-testid="empty-history"');
  });

  it('deve exibir página 404 para produto inexistente', async () => {
    const { app } = createApiFixture();

    const response = await request(app).get('/produtos/nao-existe');

    expect(response.status).toBe(404);
    expect(response.text).toContain('Produto não encontrado.');
  });

  it('deve registrar entrada pelo formulário e redirecionar com confirmação', async () => {
    const { app, url } = await fixtureWithProduct();

    const post = await request(app)
      .post(`${url}/movimentacoes`)
      .type('form')
      .send({ type: 'ENTRADA', quantity: '12', reason: 'Compra' });
    const page = await request(app).get(post.headers.location!);

    expect(post.status).toBe(303);
    expect(post.headers.location).toBe(`${url}?ok=movimentado`);
    expect(quantityShown(page.text)).toBe(12);
    expect(page.text).toContain('Movimentação registrada.');
    expect(page.text.match(/data-testid="movement-row"/g)).toHaveLength(1);
  });

  it('deve mostrar erro de estoque insuficiente sem alterar o saldo', async () => {
    const { app, url } = await fixtureWithProduct();

    const response = await request(app)
      .post(`${url}/movimentacoes`)
      .type('form')
      .send({ type: 'SAIDA', quantity: '3', reason: '' });

    expect(response.status).toBe(409);
    expect(response.text).toContain('data-testid="error-message"');
    expect(response.text).toContain('Estoque insuficiente');
    expect(quantityShown(response.text)).toBe(0);
  });

  it('deve mostrar erro de quantidade inválida mantendo os valores digitados', async () => {
    const { app, url } = await fixtureWithProduct();

    const response = await request(app)
      .post(`${url}/movimentacoes`)
      .type('form')
      .send({ type: 'ENTRADA', quantity: '2,5', reason: 'lote parcial' });

    expect(response.status).toBe(400);
    expect(response.text).toContain('Quantidade deve ser um número inteiro maior que zero.');
    expect(response.text).toContain('value="lote parcial"');
  });

  it('deve exigir motivo no ajuste de inventário', async () => {
    const { app, url } = await fixtureWithProduct();

    const response = await request(app)
      .post(`${url}/movimentacoes`)
      .type('form')
      .send({ type: 'AJUSTE', quantity: '4', reason: ' ' });

    expect(response.status).toBe(400);
    expect(response.text).toContain('Ajuste de inventário exige um motivo.');
  });

  it('deve indicar estoque baixo quando o saldo não passa do mínimo', async () => {
    const { app, url } = await fixtureWithProduct(5);

    const response = await request(app).get(url);

    expect(response.text).toContain('data-testid="low-stock-badge"');
  });

  it('deve ocultar o formulário de movimentação de produto inativo', async () => {
    const { app, url, product, inventory } = await fixtureWithProduct();
    await inventory.deactivateProduct(product.id);

    const response = await request(app).get(url);

    expect(response.text).toContain('data-testid="inactive-badge"');
    expect(response.text).not.toContain('data-testid="movement-form"');
  });

  it('deve recusar movimentação enviada para produto inativo', async () => {
    const { app, url, product, inventory } = await fixtureWithProduct();
    await inventory.deactivateProduct(product.id);

    const response = await request(app)
      .post(`${url}/movimentacoes`)
      .type('form')
      .send({ type: 'ENTRADA', quantity: '1' });

    expect(response.status).toBe(409);
    expect(response.text).toContain('inativo');
  });
});
