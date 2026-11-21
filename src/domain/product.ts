import { InvalidProductError } from './errors.js';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  costCents: number;
  minStock: number;
  quantity: number;
  active: boolean;
  createdAt: Date;
}

/** Dados informados pelo usuário ao cadastrar um produto. */
export interface ProductData {
  sku: string;
  name: string;
  category: string;
  costCents: number;
  minStock: number;
}

/** Identidade e instante de criação, fornecidos por quem chama (o domínio não gera ids). */
export interface CreationMeta {
  id: string;
  now: Date;
}

export const SKU_PATTERN = /^[A-Z0-9-]{3,20}$/;
export const NAME_MAX_LENGTH = 100;

function skuIssues(sku: string): string[] {
  return SKU_PATTERN.test(sku)
    ? []
    : ['SKU deve ter de 3 a 20 caracteres, usando apenas letras maiúsculas, números e hífen.'];
}

function nameIssues(name: string): string[] {
  const trimmed = name.trim();
  if (trimmed.length === 0) return ['Nome é obrigatório.'];
  if (trimmed.length > NAME_MAX_LENGTH) {
    return [`Nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`];
  }
  return [];
}

function costIssues(costCents: number): string[] {
  return Number.isSafeInteger(costCents) && costCents >= 0
    ? []
    : ['Preço de custo deve ser um valor inteiro em centavos maior ou igual a zero.'];
}

function minStockIssues(minStock: number): string[] {
  return Number.isSafeInteger(minStock) && minStock >= 0
    ? []
    : ['Estoque mínimo deve ser um número inteiro maior ou igual a zero.'];
}

/** Retorna a lista de problemas dos dados do produto (vazia quando válidos). */
export function validateProductData(data: ProductData): string[] {
  return [
    ...skuIssues(data.sku),
    ...nameIssues(data.name),
    ...costIssues(data.costCents),
    ...minStockIssues(data.minStock),
  ];
}

/** Cria um produto ativo e com saldo zero, ou lança InvalidProductError. */
export function createProduct(data: ProductData, meta: CreationMeta): Product {
  const normalized: ProductData = {
    ...data,
    name: data.name.trim(),
    category: data.category.trim(),
  };
  const issues = validateProductData(normalized);
  if (issues.length > 0) throw new InvalidProductError(issues);
  return {
    id: meta.id,
    ...normalized,
    quantity: 0,
    active: true,
    createdAt: meta.now,
  };
}
