import type { Movement, MovementType } from '../../domain/movement.js';
import { getUtcDayPeriod } from '../../domain/period.js';
import type { MovementRepository } from '../movementRepository.js';
import { isUniqueViolation, type Queryable } from './queryable.js';

interface MovementRow {
  id: string;
  product_id: string;
  type: MovementType;
  quantity: number;
  reason: string;
  date: Date;
}

const COLUMNS = 'id, product_id, type, quantity, reason, date';
// COLLATE "C" compara o id byte a byte, igual em qualquer configuração do servidor.
const ORDER = 'ORDER BY date, id COLLATE "C"';

function toMovement(row: MovementRow): Movement {
  return {
    id: row.id,
    productId: row.product_id,
    type: row.type,
    quantity: row.quantity,
    reason: row.reason,
    date: new Date(row.date),
  };
}

export class PostgresMovementRepository implements MovementRepository {
  constructor(private readonly db: Queryable) {}

  async save(movement: Movement): Promise<void> {
    try {
      await this.db.query(`INSERT INTO movements (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6)`, [
        movement.id,
        movement.productId,
        movement.type,
        movement.quantity,
        movement.reason,
        movement.date,
      ]);
    } catch (error) {
      if (isUniqueViolation(error, 'movements_pkey')) {
        throw new Error(`Movimentação ${movement.id} já cadastrada.`, { cause: error });
      }
      throw error;
    }
  }

  async listByProduct(productId: string): Promise<Movement[]> {
    const { rows } = await this.db.query<MovementRow>(
      `SELECT ${COLUMNS} FROM movements WHERE product_id = $1 ${ORDER}`,
      [productId],
    );
    return rows.map(toMovement);
  }

  async listByPeriod(start: Date, end: Date): Promise<Movement[]> {
    const period = getUtcDayPeriod(start, end);
    const { rows } = await this.db.query<MovementRow>(
      `SELECT ${COLUMNS} FROM movements WHERE date >= $1 AND date < $2 ${ORDER}`,
      [new Date(period.start), new Date(period.endExclusive)],
    );
    return rows.map(toMovement);
  }
}
