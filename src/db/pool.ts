import pg from 'pg';
import { poolConfig } from './poolConfig.js';

/** Cria o pool de conexões do PostgreSQL a partir da DATABASE_URL. */
export function createPool(databaseUrl: string): pg.Pool {
  const pool = new pg.Pool(poolConfig(databaseUrl));
  // Bancos gerenciados (como o Neon) encerram conexões ociosas; sem este handler
  // o erro emitido pelo cliente ocioso derrubaria o processo.
  pool.on('error', (error) => {
    console.error('Erro em conexão ociosa do PostgreSQL:', error.message);
  });
  return pool;
}
