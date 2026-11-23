import type { Movement } from '../movement.js';
import { getUtcDayPeriod } from '../period.js';

export interface DailyMovementSummary {
  date: string;
  entries: number;
  exits: number;
  balance: number;
}

export interface MovementSummary {
  totalEntries: number;
  totalExits: number;
  daily: DailyMovementSummary[];
}

export interface TopMovedProduct {
  productId: string;
  quantity: number;
}

/**
 * Resume entradas e saídas em dias UTC inclusivos, preenchendo dias sem movimento.
 * O saldo diário é entradas menos saídas, não o estoque acumulado.
 * Ajustes de inventário não são classificados como entrada ou saída.
 */
export function movementSummary(
  movements: readonly Movement[],
  start: Date,
  end: Date,
): MovementSummary {
  const period = getUtcDayPeriod(start, end);
  const days = new Map<string, DailyMovementSummary>();
  let totalEntries = 0;
  let totalExits = 0;

  for (const movement of movements) {
    const timestamp = movement.date.getTime();
    if (
      timestamp < period.start ||
      timestamp >= period.endExclusive ||
      movement.type === 'AJUSTE'
    ) {
      continue;
    }

    const date = movement.date.toISOString().slice(0, 10);
    const day = days.get(date) ?? { date, entries: 0, exits: 0, balance: 0 };
    if (movement.type === 'ENTRADA') {
      day.entries += movement.quantity;
      totalEntries += movement.quantity;
    } else {
      day.exits += movement.quantity;
      totalExits += movement.quantity;
    }
    day.balance = day.entries - day.exits;
    days.set(date, day);
  }

  const daily: DailyMovementSummary[] = [];
  for (let timestamp = period.start; timestamp < period.endExclusive; timestamp += 86_400_000) {
    const date = new Date(timestamp).toISOString().slice(0, 10);
    daily.push(days.get(date) ?? { date, entries: 0, exits: 0, balance: 0 });
  }

  return { totalEntries, totalExits, daily };
}

/**
 * Ordena pela quantidade total de saídas, com desempate pelo id do produto.
 * Quem chama fornece as movimentações já filtradas para o período desejado.
 */
export function topMovedProducts(movements: readonly Movement[], limit: number): TopMovedProduct[] {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new RangeError('O limite deve ser um número inteiro maior ou igual a zero.');
  }

  const quantities = new Map<string, number>();
  for (const movement of movements) {
    if (movement.type !== 'SAIDA') continue;
    quantities.set(
      movement.productId,
      (quantities.get(movement.productId) ?? 0) + movement.quantity,
    );
  }

  return [...quantities]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort(
      (left, right) =>
        right.quantity - left.quantity || left.productId.localeCompare(right.productId, 'en'),
    )
    .slice(0, limit);
}
