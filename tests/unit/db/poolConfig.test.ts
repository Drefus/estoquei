import { describe, expect, it } from 'vitest';
import { poolConfig } from '../../../src/db/poolConfig.js';

const NEON_URL =
  'postgresql://app:segredo@ep-exemplo-123.sa-east-1.aws.neon.tech/prateleira?sslmode=require';

describe('poolConfig', () => {
  it('deve usar SSL com verificação de certificado em banco remoto como o Neon', () => {
    expect(poolConfig(NEON_URL).ssl).toEqual({ rejectUnauthorized: true });
  });

  it('deve remover o sslmode da URL repassada ao driver', () => {
    const config = poolConfig(NEON_URL);

    expect(config.connectionString).not.toContain('sslmode');
    expect(config.connectionString).toContain('ep-exemplo-123.sa-east-1.aws.neon.tech/prateleira');
  });

  it('deve usar SSL em banco remoto mesmo sem sslmode na URL', () => {
    expect(poolConfig('postgres://app:x@db.exemplo.com/prateleira').ssl).toEqual({
      rejectUnauthorized: true,
    });
  });

  it('deve dispensar SSL em banco local', () => {
    expect(poolConfig('postgres://postgres:teste@localhost:55432/prateleira').ssl).toBe(false);
  });

  it('deve respeitar sslmode=disable explícito', () => {
    expect(poolConfig('postgres://app:x@db.exemplo.com/prateleira?sslmode=disable').ssl).toBe(
      false,
    );
  });
});
