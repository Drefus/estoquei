import { describe, expect, it } from 'vitest';
import { pendingMigrations } from '../../../src/db/migrationPlan.js';

describe('pendingMigrations', () => {
  it('deve listar as migrações em ordem crescente de nome', () => {
    const files = ['002_categorias.sql', '001_init.sql', '010_indices.sql'];

    expect(pendingMigrations(files, new Set())).toEqual([
      '001_init.sql',
      '002_categorias.sql',
      '010_indices.sql',
    ]);
  });

  it('deve ignorar migrações já aplicadas', () => {
    const files = ['001_init.sql', '002_categorias.sql'];

    expect(pendingMigrations(files, new Set(['001_init.sql']))).toEqual(['002_categorias.sql']);
  });

  it('deve ignorar arquivos que não são SQL', () => {
    const files = ['001_init.sql', 'README.md', '.gitkeep'];

    expect(pendingMigrations(files, new Set())).toEqual(['001_init.sql']);
  });

  it('deve retornar lista vazia quando todas as migrações já foram aplicadas', () => {
    expect(pendingMigrations(['001_init.sql'], new Set(['001_init.sql']))).toEqual([]);
  });
});
