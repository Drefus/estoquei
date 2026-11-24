import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        // Inicialização do processo: só lê o ambiente e chama createApp, que é testado.
        'src/server.ts',
        // Adaptadores PostgreSQL e executor de migrações dependem de um banco real.
        // Os testes de unidade e o CI usam STORAGE=memory; esses arquivos são
        // verificados pelos testes de integração em tests/postgres quando
        // TEST_DATABASE_URL está definida.
        'src/repositories/postgres/**',
        'src/db/pool.ts',
        'src/db/migrate.ts',
        'src/db/migrateCli.ts',
        'src/db/seedCli.ts',
        // Somente declarações de tipos, sem código executável (o v8 os reporta como 0 de 0).
        'src/**/*.d.ts',
        'src/repositories/productRepository.ts',
        'src/repositories/movementRepository.ts',
        'src/repositories/inventoryStore.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
