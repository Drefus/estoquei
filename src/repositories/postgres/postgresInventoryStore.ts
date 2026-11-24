import type pg from 'pg';
import type { InventoryRepositories, InventoryStore } from '../inventoryStore.js';
import { PostgresMovementRepository } from './postgresMovementRepository.js';
import { PostgresProductRepository } from './postgresProductRepository.js';
import type { Queryable } from './queryable.js';

/** Chave arbitrária do lock que serializa as escritas, como no armazenamento em memória. */
const WRITE_LOCK_KEY = 7_340_002;

function repositoriesFor(db: Queryable): InventoryRepositories {
  return {
    products: new PostgresProductRepository(db),
    movements: new PostgresMovementRepository(db),
  };
}

export class PostgresInventoryStore implements InventoryStore {
  readonly repositories: InventoryRepositories;

  constructor(private readonly pool: pg.Pool) {
    this.repositories = repositoriesFor(pool);
  }

  /**
   * Executa o trabalho em uma transação dedicada. O advisory lock garante que
   * duas movimentações do mesmo produto não leiam o mesmo saldo e percam uma
   * atualização; o volume de escrita do sistema torna a serialização suficiente.
   */
  async transaction<T>(work: (repositories: InventoryRepositories) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let broken = false;
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [WRITE_LOCK_KEY]);
      const result = await work(repositoriesFor(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        broken = true;
      }
      throw error;
    } finally {
      // Um cliente que nem conseguiu fazer ROLLBACK é descartado em vez de voltar ao pool.
      client.release(broken);
    }
  }
}
