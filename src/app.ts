import express, { type Express } from 'express';
import type { AppConfig } from './config.js';
import { healthRoutes } from './http/healthRoutes.js';
import { errorHandler } from './http/errorHandler.js';

export interface AppDeps {
  config: AppConfig;
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.set('storage', deps.config.storage);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(healthRoutes());
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } });
  });
  app.use(errorHandler);
  return app;
}
