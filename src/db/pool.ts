import pg from 'pg';

/** Cria o pool de conexões do PostgreSQL a partir da DATABASE_URL. */
export function createPool(databaseUrl: string): pg.Pool {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 5 });
  // Bancos gerenciados (como o Neon) encerram conexões ociosas; sem este handler
  // o erro emitido pelo cliente ocioso derrubaria o processo.
  pool.on('error', (error) => {
    console.error('Erro em conexão ociosa do PostgreSQL:', error.message);
  });
  return pool;
}
