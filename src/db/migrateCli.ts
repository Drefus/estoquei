import { migrate } from './migrate.js';
import { createPool } from './pool.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Defina DATABASE_URL para executar as migrações.');
  process.exit(1);
}

const pool = createPool(databaseUrl);
try {
  const applied = await migrate(pool);
  console.log(
    applied.length > 0
      ? `Migrações aplicadas: ${applied.join(', ')}`
      : 'Banco já está atualizado; nenhuma migração pendente.',
  );
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
