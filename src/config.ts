export type StorageKind = 'memory' | 'postgres';

export interface AppConfig {
  port: number;
  storage: StorageKind;
  databaseUrl: string | undefined;
}

const DEFAULT_PORT = 3000;

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT inválida: "${raw}"`);
  }
  return port;
}

function parseStorage(raw: string | undefined): StorageKind {
  const value = (raw ?? 'memory').trim().toLowerCase();
  if (value === 'memory' || value === 'postgres') return value;
  throw new Error(`STORAGE inválido: "${raw}". Use "memory" ou "postgres".`);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const storage = parseStorage(env.STORAGE);
  const databaseUrl = env.DATABASE_URL;
  if (storage === 'postgres' && !databaseUrl) {
    throw new Error('DATABASE_URL é obrigatória quando STORAGE=postgres.');
  }
  return { port: parsePort(env.PORT), storage, databaseUrl };
}
