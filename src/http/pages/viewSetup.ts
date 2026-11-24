import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import { formatCents } from '../../domain/money.js';
import { isLowStock } from '../../domain/stock.js';

/** Raiz do projeto, tanto a partir de src/http/pages quanto de dist/http/pages. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const VIEWS_DIR = path.join(ROOT, 'src', 'views');
export const PUBLIC_DIR = path.join(ROOT, 'src', 'public');

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

/** Formata data e hora no fuso de Brasília, independentemente do fuso do servidor. */
export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date);
}

/** Converte "2026-01-15" em "15/01" para os rótulos do gráfico. */
export function formatDayLabel(isoDate: string): string {
  const [, month = '', day = ''] = isoDate.split('-');
  return `${day}/${month}`;
}

export function setupViews(app: Express): void {
  app.set('views', VIEWS_DIR);
  app.set('view engine', 'ejs');
  app.locals.formatCents = formatCents;
  app.locals.formatDateTime = formatDateTime;
  app.locals.isLowStock = isLowStock;
  app.use(express.static(PUBLIC_DIR, { maxAge: '1h' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
}
