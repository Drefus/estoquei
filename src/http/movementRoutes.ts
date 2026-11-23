import { Router } from 'express';
import type { InventoryService } from '../services/inventoryService.js';
import { parseMovementBody, parseProductId } from './validation.js';

export function movementRoutes(inventory: InventoryService): Router {
  const router = Router({ mergeParams: true });
  router.post<{ id: string }>('/', async (req, res) => {
    const productId = parseProductId(req.params.id);
    const data = parseMovementBody(req.body);
    res
      .status(201)
      .json(await inventory.registerMovement(productId, data.type, data.quantity, data.reason));
  });
  router.get<{ id: string }>('/', async (req, res) => {
    res.json(await inventory.getProductHistory(parseProductId(req.params.id)));
  });
  return router;
}
