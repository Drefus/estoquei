import { Router } from 'express';
import {
  InactiveProductError,
  InsufficientStockError,
  InvalidMovementError,
} from '../../domain/errors.js';
import type { Movement } from '../../domain/movement.js';
import type { Product } from '../../domain/product.js';
import { movementDataFromForm, movementFormValues } from './forms.js';
import type { ProductFilters } from '../../repositories/productRepository.js';
import type { InventoryService } from '../../services/inventoryService.js';

function queryText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function byName(left: Product, right: Product): number {
  return left.name.localeCompare(right.name, 'pt-BR') || left.sku.localeCompare(right.sku, 'en');
}

export function productPages(inventory: InventoryService): Router {
  const router = Router();

  router.get('/produtos', async (req, res) => {
    const filters = {
      busca: queryText(req.query.busca),
      categoria: queryText(req.query.categoria),
      estoqueBaixo: req.query.estoqueBaixo === '1',
    };
    const query: ProductFilters = {
      search: filters.busca,
      category: filters.categoria,
      lowStockOnly: filters.estoqueBaixo,
    };
    const [products, all] = await Promise.all([
      inventory.listProducts(query),
      inventory.listProducts(),
    ]);
    const categories = [...new Set(all.map((product) => product.category).filter(Boolean))].sort(
      (left, right) => left.localeCompare(right, 'pt-BR'),
    );
    res.render('products/list', {
      title: 'Produtos',
      nav: 'produtos',
      products: products.sort(byName),
      categories,
      filters,
      hasProducts: all.length > 0,
      notice: queryText(req.query.ok),
    });
  });

  // Rotas com :id ficam por último para não capturar caminhos fixos como /produtos/novo.
  router.get('/produtos/:id', async (req, res) => {
    const history = await inventory.getProductHistory(req.params.id);
    res.render('products/detail', {
      ...detailLocals(history),
      notice: queryText(req.query.ok),
      movement: { type: 'ENTRADA', quantity: '', reason: '' },
      movementError: '',
    });
  });

  router.post('/produtos/:id/movimentacoes', async (req, res) => {
    const id = req.params.id;
    const values = movementFormValues(req.body);
    const data = movementDataFromForm(values);
    try {
      await inventory.registerMovement(id, data.type, data.quantity, data.reason);
      res.redirect(303, `/produtos/${encodeURIComponent(id)}?ok=movimentado`);
      return;
    } catch (error) {
      const status = movementErrorStatus(error);
      if (status === undefined) throw error;
      const history = await inventory.getProductHistory(id);
      res.status(status).render('products/detail', {
        ...detailLocals(history),
        notice: '',
        movement: values,
        movementError: movementErrorMessage(error),
      });
    }
  });

  return router;
}

function detailLocals(history: { product: Product; movements: Movement[] }) {
  return { title: history.product.name, nav: 'produtos', ...history };
}

/** Erros de regra de negócio exibidos no formulário; outros seguem para o tratamento central. */
function movementErrorStatus(error: unknown): number | undefined {
  if (error instanceof InvalidMovementError) return 400;
  if (error instanceof InsufficientStockError || error instanceof InactiveProductError) return 409;
  return undefined;
}

function movementErrorMessage(error: unknown): string {
  if (error instanceof InvalidMovementError) return error.issues.join(' ');
  return (error as Error).message;
}
