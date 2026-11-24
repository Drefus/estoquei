import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** SKU único por teste, para que os testes não dependam uns dos outros. */
export function uniqueSku(prefix = 'E2E'): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${random}`.slice(0, 20);
}

export interface NewProduct {
  sku: string;
  name: string;
  category?: string;
  cost?: string;
  minStock?: string;
}

/** Preenche e envia o formulário de novo produto, como um usuário faria. */
export async function fillProductForm(page: Page, product: NewProduct): Promise<void> {
  await page.goto('/produtos/novo');
  await page.getByLabel('SKU').fill(product.sku);
  await page.getByLabel('Nome').fill(product.name);
  await page.getByLabel('Categoria').fill(product.category ?? 'Testes');
  await page.getByLabel('Preço de custo (R$)').fill(product.cost ?? '10,00');
  await page.getByLabel('Estoque mínimo').fill(product.minStock ?? '0');
  await page.getByRole('button', { name: 'Salvar' }).click();
}

/** Cria o produto pela API quando o cadastro não é o foco do teste. Retorna o id. */
export async function createProductViaApi(
  request: APIRequestContext,
  data: { sku: string; name: string; minStock?: number; costCents?: number },
): Promise<string> {
  const response = await request.post('/api/products', {
    data: {
      sku: data.sku,
      name: data.name,
      category: 'Testes',
      costCents: data.costCents ?? 1000,
      minStock: data.minStock ?? 0,
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
}

/** Registra uma movimentação pelo formulário da página do produto. */
export async function registerMovement(
  page: Page,
  movement: {
    type: 'Entrada' | 'Saída' | 'Ajuste de inventário';
    quantity: string;
    reason?: string;
  },
): Promise<void> {
  await page.getByLabel('Tipo').selectOption({ label: movement.type });
  await page.getByLabel('Quantidade').fill(movement.quantity);
  await page.getByLabel('Motivo').fill(movement.reason ?? '');
  await page.getByRole('button', { name: 'Registrar' }).click();
}
