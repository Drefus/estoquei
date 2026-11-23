import { Router } from 'express';
import type { InventoryService } from '../services/inventoryService.js';
import { parseProductBody, parseProductFilters, parseProductId } from './validation.js';

export function productRoutes(inventory: InventoryService): Router {
  const router = Router();
  router.get('/', async (req, res) => {
    res.json(await inventory.listProducts(parseProductFilters(req.query)));
  });
  router.post('/', async (req, res) => {
    res.status(201).json(await inventory.createProduct(parseProductBody(req.body)));
  });
  router.put('/:id', async (req, res) => {
    res.json(
      await inventory.updateProduct(parseProductId(req.params.id), parseProductBody(req.body)),
    );
  });
  router.delete('/:id', async (req, res) => {
    await inventory.deactivateProduct(parseProductId(req.params.id));
    res.status(204).end();
  });
  return router;
}
