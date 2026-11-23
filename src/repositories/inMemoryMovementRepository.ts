import type { Movement } from '../domain/movement.js';
import { getUtcDayPeriod } from '../domain/period.js';
import type { MovementRepository } from './movementRepository.js';

export class InMemoryMovementRepository implements MovementRepository {
  private readonly movements = new Map<string, Movement>();

  async save(movement: Movement): Promise<void> {
    if (this.movements.has(movement.id)) {
      throw new Error(`Movimentação ${movement.id} já cadastrada.`);
    }
    this.movements.set(movement.id, structuredClone(movement));
  }

  async listByProduct(productId: string): Promise<Movement[]> {
    return this.select((movement) => movement.productId === productId);
  }

  async listByPeriod(start: Date, end: Date): Promise<Movement[]> {
    const period = getUtcDayPeriod(start, end);
    return this.select((movement) => {
      const timestamp = movement.date.getTime();
      return timestamp >= period.start && timestamp < period.endExclusive;
    });
  }

  private select(matches: (movement: Movement) => boolean): Movement[] {
    return [...this.movements.values()]
      .filter(matches)
      .sort(
        (left, right) =>
          left.date.getTime() - right.date.getTime() || left.id.localeCompare(right.id, 'en'),
      )
      .map((movement) => structuredClone(movement));
  }
}
