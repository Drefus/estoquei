import type { Movement } from '../domain/movement.js';

export interface MovementRepository {
  /** Registra uma movimentação nova; rejeita id já existente. */
  save(movement: Movement): Promise<void>;
  /** Retorna histórico em ordem de data crescente, com desempate pelo id. */
  listByProduct(productId: string): Promise<Movement[]>;
  /** Inclui dias UTC completos, do início ao fim, em ordem cronológica. */
  listByPeriod(start: Date, end: Date): Promise<Movement[]>;
}
