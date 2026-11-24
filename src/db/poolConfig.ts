import type { PoolConfig } from 'pg';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Monta a configuração do pool a partir da DATABASE_URL.
 * Bancos remotos (como o Neon) usam SSL com verificação do certificado;
 * bancos locais (Docker, desenvolvimento) usam conexão sem SSL.
 * O parâmetro sslmode da URL é tratado aqui, para que o driver não o reinterprete.
 */
export function poolConfig(databaseUrl: string): PoolConfig {
  const url = new URL(databaseUrl);
  const sslmode = url.searchParams.get('sslmode');
  url.searchParams.delete('sslmode');

  const useSsl = sslmode === null ? !LOCAL_HOSTS.has(url.hostname) : sslmode !== 'disable';
  return {
    connectionString: url.toString(),
    max: 5,
    ssl: useSsl ? { rejectUnauthorized: true } : false,
  };
}
