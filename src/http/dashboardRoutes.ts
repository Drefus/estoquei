import { Router } from 'express';
import type { InventoryService } from '../services/inventoryService.js';

export function dashboardRoutes(inventory: InventoryService): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    res.json(await inventory.getDashboard());
  });
  return router;
}
