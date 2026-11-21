/** Classe base para todos os erros de regra de negócio do Prateleira. */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidProductError extends DomainError {
  readonly code = 'INVALID_PRODUCT';

  constructor(readonly issues: readonly string[]) {
    super(`Produto inválido: ${issues.join(' ')}`);
  }
}

export class InvalidMovementError extends DomainError {
  readonly code = 'INVALID_MOVEMENT';

  constructor(readonly issues: readonly string[]) {
    super(`Movimentação inválida: ${issues.join(' ')}`);
  }
}

export class InsufficientStockError extends DomainError {
  readonly code = 'INSUFFICIENT_STOCK';

  constructor(
    readonly available: number,
    readonly requested: number,
  ) {
    super(`Estoque insuficiente: saldo disponível ${available}, saída solicitada ${requested}.`);
  }
}

export class InactiveProductError extends DomainError {
  readonly code = 'INACTIVE_PRODUCT';

  constructor(readonly productId: string) {
    super(`O produto ${productId} está inativo e não aceita movimentações.`);
  }
}

export class ProductNotFoundError extends DomainError {
  readonly code = 'PRODUCT_NOT_FOUND';

  constructor(readonly productId: string) {
    super(`Produto ${productId} não encontrado.`);
  }
}

export class DuplicateSkuError extends DomainError {
  readonly code = 'DUPLICATE_SKU';

  constructor(readonly sku: string) {
    super(`Já existe um produto com o SKU ${sku}.`);
  }
}
