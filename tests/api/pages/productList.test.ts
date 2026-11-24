import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { validProductData } from '../../unit/domain/builders.js';
import { createApiFixture } from '../helpers.js';

function rowCount(html: string): number {
  return html.match(/data-testid="product-row"/g)?.length ?? 0;
}

async function fixtureWithProducts() {
  const fixture = createApiFixture();
  const { inventory } = fixture;
  const coffee = await inventory.createProduct(
    validProductData({ sku: 'CAF-500', name: 'Café', category: 'Mercearia', minStock: 5 }),
  );
  await inventory.registerMovement(coffee.id, 'ENTRADA', 20);
  await inventory.createProduct(
    validProductData({ sku: 'DET-001', name: 'Detergente', category: 'Limpeza', minStock: 2 }),
  );
  return fixture;
}

describe('página de lista de produtos', () => {
  it('deve listar todos os produtos cadastrados', async () => {
    const { app } = await fixtureWithProducts();

    const response = await request(app).get('/produtos');

    expect(response.status).toBe(200);
    expect(rowCount(response.text)).toBe(2);
    expect(response.text).toContain('Café');
    expect(response.text).toContain('R$ 19,99');
  });

  it('deve filtrar pela busca por SKU', async () => {
    const { app } = await fixtureWithProducts();

    const response = await request(app).get('/produtos').query({ busca: 'det-0' });

    expect(rowCount(response.text)).toBe(1);
    expect(response.text).toContain('data-sku="DET-001"');
  });

  it('deve filtrar pela categoria escolhida', async () => {
    const { app } = await fixtureWithProducts();

    const response = await request(app).get('/produtos').query({ categoria: 'Mercearia' });

    expect(rowCount(response.text)).toBe(1);
    expect(response.text).toContain('data-sku="CAF-500"');
  });

  it('deve mostrar somente produtos com estoque baixo quando o filtro está marcado', async () => {
    const { app } = await fixtureWithProducts();

    const response = await request(app).get('/produtos').query({ estoqueBaixo: '1' });

    expect(rowCount(response.text)).toBe(1);
    expect(response.text).toContain('data-sku="DET-001"');
    expect(response.text).toContain('data-testid="low-stock-badge"');
  });

  it('deve oferecer as categorias existentes no filtro', async () => {
    const { app } = await fixtureWithProducts();

    const response = await request(app).get('/produtos');

    expect(response.text).toContain('<option value="Limpeza"');
    expect(response.text).toContain('<option value="Mercearia"');
  });

  it('deve convidar a cadastrar o primeiro produto quando a lista está vazia', async () => {
    const { app } = createApiFixture();

    const response = await request(app).get('/produtos');

    expect(response.text).toContain('Nenhum produto cadastrado ainda');
  });

  it('deve informar quando nenhum produto corresponde aos filtros', async () => {
    const { app } = await fixtureWithProducts();

    const response = await request(app).get('/produtos').query({ busca: 'inexistente' });

    expect(rowCount(response.text)).toBe(0);
    expect(response.text).toContain('Nenhum produto corresponde aos filtros');
  });

  it('deve escapar textos cadastrados pelo usuário', async () => {
    const { app, inventory } = createApiFixture();
    await inventory.createProduct(validProductData({ name: '<script>alert(1)</script>' }));

    const response = await request(app).get('/produtos');

    expect(response.text).not.toContain('<script>alert(1)</script>');
    expect(response.text).toContain('&lt;script&gt;');
  });
});

describe('desativação pela lista de produtos', () => {
  it('deve desativar o produto e voltar à lista com confirmação', async () => {
    const { app, inventory } = createApiFixture();
    const product = await inventory.createProduct(validProductData());

    const post = await request(app).post(`/produtos/${product.id}/desativar`);
    const page = await request(app).get(post.headers.location!);

    expect(post.status).toBe(303);
    expect(page.text).toContain('Produto desativado.');
    expect(page.text).toContain('Inativo');
    expect(page.text).not.toContain(`/produtos/${product.id}/desativar`);
    expect((await inventory.listProducts())[0]!.active).toBe(false);
  });

  it('deve exibir 404 ao desativar produto inexistente', async () => {
    const { app } = createApiFixture();

    const response = await request(app).post('/produtos/nao-existe/desativar');

    expect(response.status).toBe(404);
  });
});
