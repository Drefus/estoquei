import { Router } from 'express';
import type { InventoryService } from '../services/inventoryService.js';
import { parseProductBody, parseProductFilters } from './validation.js';

export function productRoutes(inventory: InventoryService): Router {
  const router = Router();
  router.get('/', async (req, res) => {
    res.json(await inventory.listProducts(parseProductFilters(req.query)));
  });
  router.post('/', async (req, res) => {
    res.status(201).json(await inventory.createProduct(parseProductBody(req.body)));
  });
  return router;
}
