import { MOVEMENT_TYPES, type MovementType } from '../domain/movement.js';
import type { ProductData } from '../domain/product.js';
import type { ProductFilters } from '../repositories/productRepository.js';

export class RequestValidationError extends Error {
  readonly code = 'INVALID_REQUEST';
  constructor(readonly issues: string[]) {
    super(issues.join(' '));
    this.name = 'RequestValidationError';
  }
}

export function requestObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestValidationError(['O corpo deve ser um objeto JSON.']);
  }
  return value as Record<string, unknown>;
}

export function allowedFields(data: Record<string, unknown>, allowed: readonly string[]): void {
  const unknown = Object.keys(data).filter((field) => !allowed.includes(field));
  if (unknown.length > 0)
    throw new RequestValidationError([`Campos não permitidos: ${unknown.join(', ')}.`]);
}

export function stringField(data: Record<string, unknown>, field: string): string {
  const value = data[field];
  if (typeof value !== 'string') throw new RequestValidationError([`${field} deve ser texto.`]);
  return value;
}

function numberField(data: Record<string, unknown>, field: string): number {
  const value = data[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RequestValidationError([`${field} deve ser um número finito.`]);
  }
  return value;
}

export function parseProductBody(body: unknown): ProductData {
  const data = requestObject(body);
  allowedFields(data, ['sku', 'name', 'category', 'costCents', 'minStock']);
  return {
    sku: stringField(data, 'sku'),
    name: stringField(data, 'name'),
    category: stringField(data, 'category'),
    costCents: numberField(data, 'costCents'),
    minStock: numberField(data, 'minStock'),
  };
}

export function parseMovementBody(body: unknown): {
  type: MovementType;
  quantity: number;
  reason: string;
} {
  const data = requestObject(body);
  allowedFields(data, ['type', 'quantity', 'reason']);
  const type = stringField(data, 'type');
  if (!MOVEMENT_TYPES.some((candidate) => candidate === type)) {
    throw new RequestValidationError(['Tipo de movimentação desconhecido.']);
  }
  return {
    type: type as MovementType,
    quantity: numberField(data, 'quantity'),
    reason: data.reason === undefined ? '' : stringField(data, 'reason'),
  };
}

export function parseProductFilters(query: Record<string, unknown>): ProductFilters {
  allowedFields(query, ['search', 'category', 'lowStockOnly', 'activeOnly']);
  const filters: ProductFilters = {};
  if (query.search !== undefined) filters.search = stringField(query, 'search');
  if (query.category !== undefined) filters.category = stringField(query, 'category');
  for (const field of ['lowStockOnly', 'activeOnly'] as const) {
    if (query[field] === undefined) continue;
    if (query[field] !== 'true' && query[field] !== 'false') {
      throw new RequestValidationError([`${field} deve ser true ou false.`]);
    }
    filters[field] = query[field] === 'true';
  }
  return filters;
}

export function parseProductId(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RequestValidationError(['Identificador do produto é obrigatório.']);
  }
  return value.trim();
}

function dateField(query: Record<string, unknown>, field: string): Date {
  const value = stringField(query, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RequestValidationError([`${field} deve usar o formato YYYY-MM-DD.`]);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RequestValidationError([`${field} deve ser uma data válida.`]);
  }
  return date;
}

export function parsePeriodQuery(query: Record<string, unknown>): { start: Date; end: Date } {
  allowedFields(query, ['inicio', 'fim']);
  const start = dateField(query, 'inicio');
  const end = dateField(query, 'fim');
  if (start.getTime() > end.getTime()) {
    throw new RequestValidationError(['O início do período não pode ser posterior ao fim.']);
  }
  return { start, end };
}
