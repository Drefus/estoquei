import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  it('deve usar porta 3000 e armazenamento em memória quando nada é informado', () => {
    expect(loadConfig({})).toEqual({ port: 3000, storage: 'memory', databaseUrl: undefined });
  });

  it('deve ler a porta da variável PORT', () => {
    expect(loadConfig({ PORT: '8080' }).port).toBe(8080);
  });

  it('deve rejeitar porta que não é um número inteiro positivo', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT inválida/);
  });

  it('deve aceitar STORAGE=postgres quando DATABASE_URL é informada', () => {
    const config = loadConfig({ STORAGE: 'postgres', DATABASE_URL: 'postgres://localhost/db' });
    expect(config.storage).toBe('postgres');
  });

  it('deve exigir DATABASE_URL quando STORAGE=postgres', () => {
    expect(() => loadConfig({ STORAGE: 'postgres' })).toThrow(/DATABASE_URL/);
  });

  it('deve rejeitar valor desconhecido de STORAGE', () => {
    expect(() => loadConfig({ STORAGE: 'mongo' })).toThrow(/STORAGE inválido/);
  });
});
