import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { validProductData } from '../../unit/domain/builders.js';
import { createApiFixture } from '../helpers.js';

const validForm = {
  sku: 'caf-500',
  name: 'Café torrado',
  category: 'Mercearia',
  cost: '19,90',
  minStock: '5',
};

describe('formulário de novo produto', () => {
  it('deve exibir o formulário com campos rotulados', async () => {
    const { app } = createApiFixture();

    const response = await request(app).get('/produtos/novo');

    expect(response.status).toBe(200);
    expect(response.text).toContain('<label for="campo-sku">SKU</label>');
    expect(response.text).toContain('data-testid="save-button"');
  });

  it('deve cadastrar o produto convertendo reais em centavos', async () => {
    const { app, inventory } = createApiFixture();

    const response = await request(app).post('/produtos').type('form').send(validForm);

    const [product] = await inventory.listProducts();
    expect(response.status).toBe(303);
    expect(response.headers.location).toBe(`/produtos/${product!.id}?ok=cadastrado`);
    expect(product).toMatchObject({ sku: 'CAF-500', costCents: 1990, minStock: 5 });
  });

  it('deve mostrar o erro abaixo de cada campo inválido', async () => {
    const { app } = createApiFixture();

    const response = await request(app)
      .post('/produtos')
      .type('form')
      .send({ ...validForm, sku: 'X', cost: '-3' });

    expect(response.status).toBe(400);
    expect(response.text).toContain('data-testid="error-sku"');
    expect(response.text).toContain('data-testid="error-cost"');
    expect(response.text).toContain('Informe um preço maior ou igual a zero');
    expect(response.text).not.toContain('data-testid="error-name"');
  });

  it('deve preservar os valores digitados quando há erro', async () => {
    const { app } = createApiFixture();

    const response = await request(app)
      .post('/produtos')
      .type('form')
      .send({ ...validForm, minStock: '1.5' });

    expect(response.text).toContain('value="Café torrado"');
    expect(response.text).toContain('data-testid="error-minStock"');
  });

  it('deve mostrar erro no campo SKU quando ele já está cadastrado', async () => {
    const { app, inventory } = createApiFixture();
    await inventory.createProduct(validProductData({ sku: 'CAF-500' }));

    const response = await request(app).post('/produtos').type('form').send(validForm);

    expect(response.status).toBe(409);
    expect(response.text).toContain('data-testid="error-sku"');
    expect(response.text).toContain('Já existe um produto com o SKU CAF-500.');
    expect(await inventory.listProducts()).toHaveLength(1);
  });
});

describe('formulário de edição de produto', () => {
  it('deve vir preenchido com os dados atuais do produto', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData({ costCents: 1999 }));

    const response = await request(app).get(`/produtos/${product.id}/editar`);

    expect(response.status).toBe(200);
    expect(response.text).toContain('value="CAF-500"');
    expect(response.text).toContain('value="19,99"');
  });

  it('deve salvar as alterações sem mudar o saldo', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());
    await inventory.registerMovement(product.id, 'ENTRADA', 7);

    const response = await request(app)
      .post(`/produtos/${product.id}/editar`)
      .type('form')
      .send({ ...validForm, name: 'Café especial' });

    const [saved] = await inventory.listProducts();
    expect(response.status).toBe(303);
    expect(response.headers.location).toBe(`/produtos/${product.id}?ok=salvo`);
    expect(saved).toMatchObject({ name: 'Café especial', quantity: 7 });
  });

  it('deve impedir usar o SKU de outro produto', async () => {
    const { app, inventory } = createApiFixture();
    await inventory.createProduct(validProductData({ sku: 'CAF-500' }));
    const other = await inventory.createProduct(validProductData({ sku: 'DET-001' }));

    const response = await request(app)
      .post(`/produtos/${other.id}/editar`)
      .type('form')
      .send(validForm);

    expect(response.status).toBe(409);
    expect(response.text).toContain(`action="/produtos/${other.id}/editar"`);
  });

  it('deve exibir 404 ao editar produto inexistente', async () => {
    const { app } = createApiFixture();

    const response = await request(app).get('/produtos/nao-existe/editar');

    expect(response.status).toBe(404);
  });
});
