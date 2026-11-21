import express, { type Express } from 'express';
import type { AppConfig } from './config.js';
import { healthRoutes } from './http/healthRoutes.js';

export interface AppDeps {
  config: AppConfig;
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.set('storage', deps.config.storage);
  app.disable('x-powered-by');
  app.use(express.json());
  app.use(healthRoutes());
  return app;
}
