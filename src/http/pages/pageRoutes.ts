import { Router, type ErrorRequestHandler, type RequestHandler } from 'express';
import { ProductNotFoundError } from '../../domain/errors.js';
import type { InventoryService } from '../../services/inventoryService.js';
import { dashboardPage } from './dashboardPage.js';
import { productPages } from './productPages.js';

/** Responde 404 com página amigável, ou JSON para rotas da API. */
export const notFoundHandler: RequestHandler = (req, res) => {
  if (req.path.startsWith('/api/') || req.path === '/api') {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } });
    return;
  }
  res.status(404).render('404', { nav: '' });
};

const productNotFoundPage: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof ProductNotFoundError) {
    res.status(404).render('404', { nav: '', message: 'Produto não encontrado.' });
    return;
  }
  next(error);
};

export function pageRoutes(inventory: InventoryService): Router {
  const router = Router();
  router.use(dashboardPage(inventory));
  router.use(productPages(inventory));
  router.use(productNotFoundPage);
  return router;
}
