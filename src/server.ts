import { createApp } from './app.js';
import { loadConfig, type AppConfig } from './config.js';
import { createPool } from './db/pool.js';
import { PostgresInventoryStore } from './repositories/postgres/postgresInventoryStore.js';
import { InventoryService } from './services/inventoryService.js';

function createInventory(config: AppConfig): InventoryService | undefined {
  // Em memória, createApp monta o serviço padrão.
  if (config.storage !== 'postgres' || !config.databaseUrl) return undefined;
  return new InventoryService({
    store: new PostgresInventoryStore(createPool(config.databaseUrl)),
  });
}

const config = loadConfig();
const inventory = createInventory(config);
const app = createApp(inventory ? { config, inventory } : { config });

app.listen(config.port, () => {
  console.log(`Prateleira ouvindo em http://localhost:${config.port} (storage=${config.storage})`);
});
