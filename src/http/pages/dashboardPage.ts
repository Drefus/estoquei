import { Router } from 'express';
import type { MovementSummary } from '../../domain/reports/movements.js';
import type { InventoryService } from '../../services/inventoryService.js';
import { formatDayLabel } from './viewSetup.js';

export interface DailyChartData {
  labels: string[];
  entries: number[];
  exits: number[];
}

/** Prepara as séries do gráfico de barras a partir do resumo diário. */
export function dailyChartData(summary: MovementSummary): DailyChartData {
  return {
    labels: summary.daily.map((day) => formatDayLabel(day.date)),
    entries: summary.daily.map((day) => day.entries),
    exits: summary.daily.map((day) => day.exits),
  };
}

/** Período sugerido para o CSV: do primeiro ao último dia do resumo (vazio se não houver dias). */
export function summaryPeriod(summary: MovementSummary): { start: string; end: string } {
  const days = summary.daily;
  return { start: days[0]?.date ?? '', end: days.at(-1)?.date ?? '' };
}

/** Serializa JSON para dentro de <script> sem permitir o fechamento da tag. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function dashboardPage(inventory: InventoryService): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    const dashboard = await inventory.getDashboard();
    res.render('dashboard', {
      title: 'Painel',
      nav: 'painel',
      dashboard,
      chartJson: jsonForScript(dailyChartData(dashboard.movementSummary)),
      period: summaryPeriod(dashboard.movementSummary),
    });
  });
  return router;
}
