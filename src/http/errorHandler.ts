import type { ErrorRequestHandler } from 'express';
import { DomainError, InvalidMovementError, InvalidProductError } from '../domain/errors.js';
import { RequestValidationError } from './validation.js';

const domainStatuses: Record<string, number> = {
  INVALID_PRODUCT: 400,
  INVALID_MOVEMENT: 400,
  PRODUCT_NOT_FOUND: 404,
  DUPLICATE_SKU: 409,
  INSUFFICIENT_STOCK: 409,
  INACTIVE_PRODUCT: 409,
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof RequestValidationError) {
    res
      .status(400)
      .json({ error: { code: error.code, message: error.message, issues: error.issues } });
    return;
  }
  if (error instanceof DomainError) {
    const issues =
      error instanceof InvalidProductError || error instanceof InvalidMovementError
        ? error.issues
        : undefined;
    res
      .status(domainStatuses[error.code] ?? 500)
      .json({ error: { code: error.code, message: error.message, ...(issues ? { issues } : {}) } });
    return;
  }
  if (error instanceof Error && 'type' in error && error.type === 'entity.parse.failed') {
    res
      .status(400)
      .json({ error: { code: 'INVALID_JSON', message: 'O corpo contém JSON inválido.' } });
    return;
  }
  if (error instanceof Error && 'type' in error && error.type === 'entity.too.large') {
    res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'O corpo da requisição excede o limite permitido.',
      },
    });
    return;
  }
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } });
};
