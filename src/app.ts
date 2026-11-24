import express, { type Express } from 'express';
import type { AppConfig } from './config.js';
import { healthRoutes } from './http/healthRoutes.js';
import { errorHandler } from './http/errorHandler.js';
import { productRoutes } from './http/productRoutes.js';
import { dashboardRoutes } from './http/dashboardRoutes.js';
import { reportRoutes } from './http/reportRoutes.js';
import { notFoundHandler, pageRoutes } from './http/pages/pageRoutes.js';
import { setupViews } from './http/pages/viewSetup.js';
import { InventoryService } from './services/inventoryService.js';
import { InMemoryInventoryStore } from './repositories/inMemoryInventoryStore.js';

export interface AppDeps {
  config: AppConfig;
  inventory?: InventoryService;
}

export function createApp(deps: AppDeps): Express {
  if (!deps.inventory && deps.config.storage === 'postgres') {
    throw new Error('STORAGE=postgres exige um InventoryService conectado ao PostgreSQL.');
  }
  const inventory = deps.inventory ?? new InventoryService({ store: new InMemoryInventoryStore() });
  const app = express();
  app.set('storage', deps.config.storage);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  setupViews(app);
  app.use(healthRoutes());
  app.use('/api/products', productRoutes(inventory));
  app.use('/api/dashboard', dashboardRoutes(inventory));
  app.use('/api/reports', reportRoutes(inventory));
  app.use(pageRoutes(inventory));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
