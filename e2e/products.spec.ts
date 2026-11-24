import { expect, test } from '@playwright/test';
import { createProductViaApi, fillProductForm, uniqueSku } from './helpers.js';

test.describe('cadastro e busca de produtos', () => {
  test('deve cadastrar um produto e vê-lo na lista de produtos', async ({ page }) => {
    const sku = uniqueSku('CAD');

    await fillProductForm(page, { sku, name: 'Café torrado 500g', cost: '19,90' });

    await expect(page.getByTestId('success-message')).toHaveText('Produto cadastrado.');
    await page.getByRole('link', { name: 'Produtos', exact: true }).click();
    const row = page.getByTestId('product-row').filter({ hasText: sku });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Café torrado 500g');
    await expect(row).toContainText('R$ 19,90');
  });

  test('deve mostrar erro ao cadastrar produto com SKU já existente', async ({ page, request }) => {
    const sku = uniqueSku('DUP');
    await createProductViaApi(request, { sku, name: 'Produto original' });

    await fillProductForm(page, { sku, name: 'Produto repetido' });

    await expect(page.getByTestId('error-sku')).toHaveText(
      `Já existe um produto com o SKU ${sku}.`,
    );
    await expect(page.getByLabel('Nome')).toHaveValue('Produto repetido');
  });

  test('deve buscar um produto pelo SKU e mostrar apenas ele', async ({ page, request }) => {
    const wanted = uniqueSku('BUS');
    const other = uniqueSku('OUT');
    await createProductViaApi(request, { sku: wanted, name: 'Produto procurado' });
    await createProductViaApi(request, { sku: other, name: 'Outro produto' });

    await page.goto('/produtos');
    await page.getByLabel('Buscar por nome ou SKU').fill(wanted);
    await page.getByRole('button', { name: 'Filtrar' }).click();

    await expect(page.getByTestId('product-row')).toHaveCount(1);
    await expect(page.getByTestId('product-row')).toContainText(wanted);
    await expect(page.getByText('1 produto encontrado')).toBeVisible();
  });
});
