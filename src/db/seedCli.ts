// Cadastra produtos de exemplo no PostgreSQL. Executado só manualmente (npm run db:seed),
// nunca na inicialização do servidor.
import { PostgresInventoryStore } from '../repositories/postgres/postgresInventoryStore.js';
import { InventoryService } from '../services/inventoryService.js';
import { createPool } from './pool.js';
import { seedInventory } from './seed.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Defina DATABASE_URL para cadastrar os produtos de exemplo.');
  process.exit(1);
}

const pool = createPool(databaseUrl);
try {
  const inventory = new InventoryService({ store: new PostgresInventoryStore(pool) });
  const created = await seedInventory(inventory);
  console.log(
    created.length > 0
      ? `Produtos de exemplo cadastrados: ${created.join(', ')}`
      : 'Os produtos de exemplo já estavam cadastrados.',
  );
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
