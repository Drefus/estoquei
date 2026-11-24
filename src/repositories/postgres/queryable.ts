import type pg from 'pg';

/** Pool ou cliente dedicado de uma transação: ambos executam consultas. */
export type Queryable = Pick<pg.PoolClient, 'query'>;

/** Verifica se o erro do PostgreSQL é violação de unicidade (23505) da restrição informada. */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505' &&
    'constraint' in error &&
    error.constraint === constraint
  );
}
