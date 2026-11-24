import type { MovementType } from '../../domain/movement.js';
import type { Product, ProductData } from '../../domain/product.js';

/** Valores digitados no formulário de produto, mantidos como texto para reexibição. */
export interface ProductFormValues {
  sku: string;
  name: string;
  category: string;
  cost: string;
  minStock: string;
}

export interface MovementFormValues {
  type: string;
  quantity: string;
  reason: string;
}

function text(body: unknown, field: string): string {
  if (body === null || typeof body !== 'object') return '';
  const value = (body as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : '';
}

/**
 * Converte um valor em reais digitado pelo usuário ("19,90", "19.9", "R$ 5") para centavos.
 * Retorna NaN quando o texto não é um valor monetário, deixando a mensagem para o domínio.
 */
export function parseReaisToCents(input: string): number {
  const normalized = input.replace(/R\$/i, '').replace(/\s/g, '');
  const match = /^(-?)(\d+)(?:[.,](\d{1,2}))?$/.exec(normalized);
  if (!match) return Number.NaN;
  const [, sign, reais = '0', fraction = ''] = match;
  const cents = Number(reais) * 100 + Number(fraction.padEnd(2, '0'));
  return sign === '-' ? -cents : cents;
}

/** Formata centavos para o campo de preço (1999 → "19,99"), sem o símbolo da moeda. */
export function centsToInput(cents: number): string {
  return `${Math.trunc(cents / 100)},${String(Math.abs(cents) % 100).padStart(2, '0')}`;
}

/** Converte texto em número; vazio vira NaN para que o domínio aponte o campo obrigatório. */
export function parseNumberField(input: string): number {
  const trimmed = input.trim().replace(',', '.');
  return trimmed === '' ? Number.NaN : Number(trimmed);
}

export function productFormValues(body: unknown): ProductFormValues {
  return {
    sku: text(body, 'sku').trim().toUpperCase(),
    name: text(body, 'name'),
    category: text(body, 'category'),
    cost: text(body, 'cost'),
    minStock: text(body, 'minStock'),
  };
}

export function productFormFromProduct(product: Product): ProductFormValues {
  return {
    sku: product.sku,
    name: product.name,
    category: product.category,
    cost: centsToInput(product.costCents),
    minStock: String(product.minStock),
  };
}

export function productDataFromForm(values: ProductFormValues): ProductData {
  return {
    sku: values.sku,
    name: values.name,
    category: values.category,
    costCents: parseReaisToCents(values.cost),
    minStock: parseNumberField(values.minStock),
  };
}

export function movementFormValues(body: unknown): MovementFormValues {
  return {
    type: text(body, 'type'),
    quantity: text(body, 'quantity'),
    reason: text(body, 'reason'),
  };
}

export function movementDataFromForm(values: MovementFormValues): {
  type: MovementType;
  quantity: number;
  reason: string;
} {
  return {
    type: values.type as MovementType,
    quantity: parseNumberField(values.quantity),
    reason: values.reason,
  };
}
