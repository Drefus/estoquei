import { Router, type Request, type Response } from 'express';
import {
  DuplicateSkuError,
  InactiveProductError,
  InsufficientStockError,
  InvalidMovementError,
} from '../../domain/errors.js';
import type { Movement } from '../../domain/movement.js';
import {
  validateProductFields,
  type Product,
  type ProductFieldIssues,
} from '../../domain/product.js';
import type { ProductFilters } from '../../repositories/productRepository.js';
import type { InventoryService } from '../../services/inventoryService.js';
import {
  movementDataFromForm,
  movementFormValues,
  productDataFromForm,
  productFormFromProduct,
  productFormValues,
  type ProductFormValues,
} from './forms.js';

/** Erros por campo do formulário (o preço aparece como "cost", em reais). */
type FormErrors = Partial<Record<keyof ProductFormValues, string[]>>;

function formErrors(issues: ProductFieldIssues): FormErrors {
  const { costCents, ...rest } = issues;
  // O domínio fala em centavos; no formulário o usuário digita reais.
  return costCents
    ? { ...rest, cost: ['Informe um preço maior ou igual a zero, por exemplo 19,90.'] }
    : rest;
}

function queryText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function categoriesOf(products: Product[]): string[] {
  return [...new Set(products.map((product) => product.category).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right, 'pt-BR'),
  );
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
    res.render('products/list', {
      title: 'Produtos',
      nav: 'produtos',
      products: products.sort(byName),
      categories: categoriesOf(all),
      filters,
      hasProducts: all.length > 0,
      notice: queryText(req.query.ok),
    });
  });

  async function renderProductForm(
    res: Response,
    form: { mode: 'novo' | 'editar'; id?: string; values: ProductFormValues; errors?: FormErrors },
    status = 200,
  ): Promise<void> {
    const editing = form.mode === 'editar' && form.id !== undefined;
    const productUrl = editing ? `/produtos/${encodeURIComponent(form.id!)}` : '';
    res.status(status).render('products/form', {
      title: editing ? 'Editar produto' : 'Novo produto',
      nav: editing ? 'produtos' : 'novo',
      action: editing ? `${productUrl}/editar` : '/produtos',
      cancelUrl: editing ? productUrl : '/produtos',
      values: form.values,
      errors: form.errors ?? {},
      categories: categoriesOf(await inventory.listProducts()),
    });
  }

  /** Valida o formulário, salva e redireciona; em caso de erro, reexibe o formulário. */
  async function submitProductForm(req: Request, res: Response, id?: string): Promise<void> {
    const values = productFormValues(req.body);
    const data = productDataFromForm(values);
    const mode = id === undefined ? 'novo' : 'editar';
    const errors = formErrors(validateProductFields(data));
    if (Object.keys(errors).length > 0) {
      await renderProductForm(res, { mode, ...(id ? { id } : {}), values, errors }, 400);
      return;
    }
    try {
      const saved =
        id === undefined
          ? await inventory.createProduct(data)
          : await inventory.updateProduct(id, data);
      const notice = id === undefined ? 'cadastrado' : 'salvo';
      res.redirect(303, `/produtos/${encodeURIComponent(saved.id)}?ok=${notice}`);
    } catch (error) {
      if (!(error instanceof DuplicateSkuError)) throw error;
      const skuError = { sku: [`Já existe um produto com o SKU ${error.sku}.`] };
      await renderProductForm(res, { mode, ...(id ? { id } : {}), values, errors: skuError }, 409);
    }
  }

  router.get('/produtos/novo', async (_req, res) => {
    await renderProductForm(res, {
      mode: 'novo',
      values: { sku: '', name: '', category: '', cost: '', minStock: '0' },
    });
  });

  router.post('/produtos', (req, res) => submitProductForm(req, res));

  // Rotas com :id ficam por último para não capturar caminhos fixos como /produtos/novo.
  router.get('/produtos/:id/editar', async (req, res) => {
    const { product } = await inventory.getProductHistory(req.params.id);
    await renderProductForm(res, {
      mode: 'editar',
      id: product.id,
      values: productFormFromProduct(product),
    });
  });

  router.post('/produtos/:id/editar', (req, res) => submitProductForm(req, res, req.params.id));

  router.post('/produtos/:id/desativar', async (req, res) => {
    await inventory.deactivateProduct(req.params.id);
    res.redirect(303, '/produtos?ok=desativado');
  });

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
