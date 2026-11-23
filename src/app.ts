import express, { type Express } from 'express';
import type { AppConfig } from './config.js';
import { healthRoutes } from './http/healthRoutes.js';
import { errorHandler } from './http/errorHandler.js';
import { productRoutes } from './http/productRoutes.js';
import { dashboardRoutes } from './http/dashboardRoutes.js';
import { reportRoutes } from './http/reportRoutes.js';
import { InventoryService } from './services/inventoryService.js';
import { InMemoryInventoryStore } from './repositories/inMemoryInventoryStore.js';

export interface AppDeps {
  config: AppConfig;
  inventory?: InventoryService;
}

export function createApp(deps: AppDeps): Express {
  if (!deps.inventory && deps.config.storage === 'postgres') {
    throw new Error('O armazenamento PostgreSQL ainda precisa de um adaptador de InventoryStore.');
  }
  const inventory = deps.inventory ?? new InventoryService({ store: new InMemoryInventoryStore() });
  const app = express();
  app.set('storage', deps.config.storage);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(healthRoutes());
  app.use('/api/products', productRoutes(inventory));
  app.use('/api/dashboard', dashboardRoutes(inventory));
  app.use('/api/reports', reportRoutes(inventory));
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } });
  });
  app.use(errorHandler);
  return app;
}
