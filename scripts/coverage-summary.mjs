// Converte coverage/coverage-summary.json em uma tabela Markdown.
// No GitHub Actions a saída é anexada a $GITHUB_STEP_SUMMARY e aparece na página da execução.
import { readFileSync } from 'node:fs';

const THRESHOLD = 80;
const file = process.argv[2] ?? 'coverage/coverage-summary.json';
const { total } = JSON.parse(readFileSync(file, 'utf8'));

const metrics = [
  ['Linhas', total.lines],
  ['Instruções', total.statements],
  ['Funções', total.functions],
  ['Ramos', total.branches],
];

const rows = metrics.map(([name, metric]) => {
  const status = metric.pct >= THRESHOLD ? '✅' : '❌';
  return `| ${name} | ${metric.pct.toFixed(2)}% | ${metric.covered}/${metric.total} | ${status} |`;
});

console.log(
  [
    '## Cobertura de testes',
    '',
    `Limite mínimo: ${THRESHOLD}% em cada métrica. O relatório HTML completo está no artefato \`coverage\`.`,
    '',
    '| Métrica | Cobertura | Cobertos/Total | Situação |',
    '| --- | ---: | ---: | :---: |',
    ...rows,
  ].join('\n'),
);
