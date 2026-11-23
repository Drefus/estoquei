import { Router } from 'express';
import type { InventoryService } from '../services/inventoryService.js';
import { movementCsv } from './movementCsv.js';
import { parsePeriodQuery } from './validation.js';

export function reportRoutes(inventory: InventoryService): Router {
  const router = Router();
  router.get('/movements.csv', async (req, res) => {
    const { start, end } = parsePeriodQuery(req.query);
    const movements = await inventory.listMovementsByPeriod(start, end);
    const filename = `movimentacoes-${start.toISOString().slice(0, 10)}-${end.toISOString().slice(0, 10)}.csv`;
    res.attachment(filename).type('text/csv').send(movementCsv(movements));
  });
  return router;
}
