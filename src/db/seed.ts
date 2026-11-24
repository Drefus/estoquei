import type { MovementType } from '../domain/movement.js';
import type { ProductData } from '../domain/product.js';
import type { InventoryService } from '../services/inventoryService.js';

interface SampleProduct extends ProductData {
  movements: { type: MovementType; quantity: number; reason?: string }[];
}

/** Produtos de demonstração; alguns terminam abaixo do mínimo para aparecer no painel. */
export const SAMPLE_PRODUCTS: readonly SampleProduct[] = [
  {
    sku: 'CAF-500',
    name: 'Café torrado 500g',
    category: 'Mercearia',
    costCents: 1899,
    minStock: 10,
    movements: [
      { type: 'ENTRADA', quantity: 40, reason: 'Compra do fornecedor' },
      { type: 'SAIDA', quantity: 12, reason: 'Venda' },
    ],
  },
  {
    sku: 'ARR-5KG',
    name: 'Arroz tipo 1 5kg',
    category: 'Mercearia',
    costCents: 2490,
    minStock: 8,
    movements: [
      { type: 'ENTRADA', quantity: 20, reason: 'Compra do fornecedor' },
      { type: 'SAIDA', quantity: 15, reason: 'Venda' },
    ],
  },
  {
    sku: 'FEI-1KG',
    name: 'Feijão carioca 1kg',
    category: 'Mercearia',
    costCents: 799,
    minStock: 12,
    movements: [{ type: 'ENTRADA', quantity: 30, reason: 'Compra do fornecedor' }],
  },
  {
    sku: 'DET-500',
    name: 'Detergente neutro 500ml',
    category: 'Limpeza',
    costCents: 289,
    minStock: 15,
    movements: [
      { type: 'ENTRADA', quantity: 24, reason: 'Compra do fornecedor' },
      { type: 'SAIDA', quantity: 14, reason: 'Venda' },
    ],
  },
  {
    sku: 'SAB-PO-1KG',
    name: 'Sabão em pó 1kg',
    category: 'Limpeza',
    costCents: 1250,
    minStock: 6,
    movements: [
      { type: 'ENTRADA', quantity: 10, reason: 'Compra do fornecedor' },
      { type: 'AJUSTE', quantity: 9, reason: 'Inventário: embalagem danificada' },
    ],
  },
  {
    sku: 'PAP-HIG-12',
    name: 'Papel higiênico 12 rolos',
    category: 'Higiene',
    costCents: 1590,
    minStock: 5,
    movements: [
      { type: 'ENTRADA', quantity: 6, reason: 'Compra do fornecedor' },
      { type: 'SAIDA', quantity: 3, reason: 'Venda' },
    ],
  },
];

/**
 * Cadastra os produtos de exemplo que ainda não existem (pelo SKU) e registra
 * suas movimentações. Pode ser executada mais de uma vez sem duplicar dados.
 * Retorna os SKUs cadastrados nesta execução.
 */
export async function seedInventory(
  inventory: InventoryService,
  samples: readonly SampleProduct[] = SAMPLE_PRODUCTS,
): Promise<string[]> {
  const existing = new Set((await inventory.listProducts()).map((product) => product.sku));
  const created: string[] = [];
  for (const { movements, ...data } of samples) {
    if (existing.has(data.sku)) continue;
    const product = await inventory.createProduct(data);
    for (const movement of movements) {
      await inventory.registerMovement(
        product.id,
        movement.type,
        movement.quantity,
        movement.reason,
      );
    }
    created.push(product.sku);
  }
  return created;
}
