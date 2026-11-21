import { InsufficientStockError, InvalidMovementError } from './errors.js';
import { validateMovementData, type Movement } from './movement.js';
import type { Product } from './product.js';

function nextQuantity(current: number, movement: Movement): number {
  switch (movement.type) {
    case 'ENTRADA':
      return current + movement.quantity;
    case 'SAIDA':
      return current - movement.quantity;
    case 'AJUSTE':
      return movement.quantity;
  }
}

/**
 * Aplica a movimentação ao produto e devolve um novo produto com o saldo atualizado.
 * Não altera os objetos recebidos.
 */
export function applyMovement(product: Product, movement: Movement): Product {
  if (movement.productId !== product.id) {
    throw new InvalidMovementError(['A movimentação pertence a outro produto.']);
  }
  const issues = validateMovementData(movement);
  if (issues.length > 0) throw new InvalidMovementError(issues);
  if (movement.type === 'SAIDA' && movement.quantity > product.quantity) {
    throw new InsufficientStockError(product.quantity, movement.quantity);
  }

  return { ...product, quantity: nextQuantity(product.quantity, movement) };
}
