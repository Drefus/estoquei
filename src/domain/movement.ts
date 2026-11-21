import { InvalidMovementError } from './errors.js';
import type { CreationMeta } from './product.js';

export const MOVEMENT_TYPES = ['ENTRADA', 'SAIDA', 'AJUSTE'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export interface Movement {
  id: string;
  productId: string;
  type: MovementType;
  /** Em ENTRADA/SAIDA, a quantidade movimentada; em AJUSTE, o novo saldo absoluto. */
  quantity: number;
  reason: string;
  date: Date;
}

export interface MovementData {
  productId: string;
  type: MovementType;
  quantity: number;
  reason?: string;
}

function isMovementType(value: unknown): value is MovementType {
  return (MOVEMENT_TYPES as readonly unknown[]).includes(value);
}

function quantityIssues(type: MovementType, quantity: number): string[] {
  if (type === 'AJUSTE') {
    return Number.isSafeInteger(quantity) && quantity >= 0
      ? []
      : ['No ajuste, o novo saldo deve ser um número inteiro maior ou igual a zero.'];
  }
  return Number.isSafeInteger(quantity) && quantity > 0
    ? []
    : ['Quantidade deve ser um número inteiro maior que zero.'];
}

function reasonIssues(type: MovementType, reason: string | undefined): string[] {
  if (type !== 'AJUSTE') return [];
  return (reason ?? '').trim().length > 0 ? [] : ['Ajuste de inventário exige um motivo.'];
}

/** Retorna a lista de problemas dos dados da movimentação (vazia quando válidos). */
export function validateMovementData(data: MovementData): string[] {
  const issues: string[] = [];
  if (data.productId.trim().length === 0) issues.push('Produto é obrigatório.');
  if (!isMovementType(data.type)) {
    issues.push(`Tipo deve ser um de: ${MOVEMENT_TYPES.join(', ')}.`);
    return issues;
  }
  return [
    ...issues,
    ...quantityIssues(data.type, data.quantity),
    ...reasonIssues(data.type, data.reason),
  ];
}

/** Cria uma movimentação validada, ou lança InvalidMovementError. */
export function createMovement(data: MovementData, meta: CreationMeta): Movement {
  const normalized: MovementData = { ...data, reason: (data.reason ?? '').trim() };
  const issues = validateMovementData(normalized);
  if (issues.length > 0) throw new InvalidMovementError(issues);
  return {
    id: meta.id,
    productId: normalized.productId,
    type: normalized.type,
    quantity: normalized.quantity,
    reason: normalized.reason ?? '',
    date: meta.now,
  };
}
