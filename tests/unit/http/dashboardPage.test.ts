import { describe, expect, it } from 'vitest';
import { dailyChartData, jsonForScript } from '../../../src/http/pages/dashboardPage.js';
import { formatDateTime, formatDayLabel } from '../../../src/http/pages/viewSetup.js';

describe('dados do gráfico do painel', () => {
  it('deve gerar rótulos dia/mês e séries de entradas e saídas na ordem dos dias', () => {
    const chart = dailyChartData({
      totalEntries: 5,
      totalExits: 2,
      daily: [
        { date: '2026-01-30', entries: 5, exits: 0, balance: 5 },
        { date: '2026-01-31', entries: 0, exits: 2, balance: -2 },
      ],
    });

    expect(chart).toEqual({ labels: ['30/01', '31/01'], entries: [5, 0], exits: [0, 2] });
  });

  it('deve impedir que o JSON embutido feche a tag script', () => {
    const json = jsonForScript({ label: '</script><script>alert(1)</script>' });

    expect(json).not.toContain('</script>');
    expect(JSON.parse(json)).toEqual({ label: '</script><script>alert(1)</script>' });
  });
});

describe('formatação de datas nas páginas', () => {
  it('deve converter data ISO em dia/mês', () => {
    expect(formatDayLabel('2026-03-07')).toBe('07/03');
  });

  it('deve exibir data e hora no fuso de Brasília', () => {
    expect(formatDateTime(new Date('2026-01-15T12:30:00.000Z'))).toBe('15/01/2026, 09:30');
  });
});
