import { expect, test } from '@playwright/test';
import { createProductViaApi, registerMovement, uniqueSku } from './helpers.js';

test.describe('movimentações de estoque', () => {
  test('deve aumentar o saldo ao registrar uma entrada', async ({ page, request }) => {
    const id = await createProductViaApi(request, { sku: uniqueSku('ENT'), name: 'Arroz 5kg' });
    await page.goto(`/produtos/${id}`);
    await expect(page.getByTestId('product-quantity')).toHaveText('0');

    await registerMovement(page, { type: 'Entrada', quantity: '15', reason: 'Compra' });

    await expect(page.getByTestId('success-message')).toHaveText('Movimentação registrada.');
    await expect(page.getByTestId('product-quantity')).toHaveText('15');
    await expect(page.getByTestId('movement-row')).toHaveCount(1);
  });

  test('deve mostrar erro de estoque insuficiente ao tirar mais que o saldo', async ({
    page,
    request,
  }) => {
    const id = await createProductViaApi(request, { sku: uniqueSku('INS'), name: 'Feijão 1kg' });
    await page.goto(`/produtos/${id}`);
    await registerMovement(page, { type: 'Entrada', quantity: '3' });

    await registerMovement(page, { type: 'Saída', quantity: '5' });

    await expect(page.getByTestId('error-message')).toContainText('Estoque insuficiente');
    await expect(page.getByTestId('product-quantity')).toHaveText('3');
  });

  test('deve mostrar no painel o produto que ficou abaixo do mínimo', async ({ page, request }) => {
    const sku = uniqueSku('MIN');
    const id = await createProductViaApi(request, { sku, name: 'Açúcar 1kg', minStock: 5 });
    await page.goto(`/produtos/${id}`);
    await registerMovement(page, { type: 'Entrada', quantity: '10' });
    await page.goto('/');
    await expect(page.getByTestId('low-stock-row').filter({ hasText: sku })).toHaveCount(0);

    await page.goto(`/produtos/${id}`);
    await registerMovement(page, { type: 'Saída', quantity: '6', reason: 'Venda' });
    await expect(page.getByTestId('low-stock-badge')).toBeVisible();
    await page.getByRole('link', { name: 'Painel' }).click();

    await expect(page.getByTestId('low-stock-row').filter({ hasText: sku })).toBeVisible();
    await expect(page.getByTestId('total-value')).toContainText('R$');
  });
});
