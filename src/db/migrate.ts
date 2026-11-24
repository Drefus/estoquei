import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';
import { pendingMigrations } from './migrationPlan.js';

/** db/migrations na raiz do projeto, tanto a partir de src/db quanto de dist/db. */
export const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'db',
  'migrations',
);

/** Chave arbitrária para impedir que duas instâncias migrem ao mesmo tempo. */
const MIGRATION_LOCK_KEY = 7_340_001;

/** Aplica, em transações separadas, as migrações ainda não registradas. Retorna os nomes aplicados. */
export async function migrate(pool: pg.Pool, dir: string = MIGRATIONS_DIR): Promise<string[]> {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
    const pending = pendingMigrations(await readdir(dir), new Set(rows.map((row) => row.name)));

    for (const name of pending) {
      const sql = await readFile(path.join(dir, name), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Falha ao aplicar a migração ${name}: ${(error as Error).message}`, {
          cause: error,
        });
      }
    }
    return pending;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]).catch(() => {});
    client.release();
  }
}
