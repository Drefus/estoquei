import { Router } from 'express';
import type { Product } from '../../domain/product.js';
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

  return router;
}
