import type { Movement } from '../domain/movement.js';

function csvCell(value: string | number): string {
  let text = String(value);
  // O tab fica dentro das aspas; o valor original permanece intacto no histórico.
  if (/^\s*[=+\-@＝＋－＠]/u.test(text)) text = `\t${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function movementCsv(movements: readonly Movement[]): string {
  const rows = movements.map((movement) =>
    [
      movement.id,
      movement.productId,
      movement.type,
      movement.quantity,
      movement.reason,
      movement.date.toISOString(),
    ]
      .map(csvCell)
      .join(','),
  );
  return ['id,produtoId,tipo,quantidade,motivo,data', ...rows].join('\r\n') + '\r\n';
}
