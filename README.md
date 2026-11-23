# Prateleira

[![CI](https://github.com/Drefus/estoquei/actions/workflows/ci.yml/badge.svg)](https://github.com/Drefus/estoquei/actions/workflows/ci.yml)

Controle de estoque simples desenvolvido para a disciplina de Engenharia de Software 2.

## Integrantes

<!-- Preencher com nome e matrícula. -->

## Sobre o sistema

<!-- Descrever o sistema. -->

## Tecnologias

<!-- Listar as tecnologias utilizadas. -->

## Uso de IA

<!-- Descrever como ferramentas de IA foram usadas no trabalho. -->

## Execução dos testes

Com Node.js e npm instalados, execute na raiz do repositório:

```sh
npm ci
npm test
npm run test:coverage
```

`npm test` executa os testes de unidade em `tests/unit` e os testes HTTP em
`tests/http`. Os testes usam armazenamento em memória, configurado pelos scripts
com `cross-env`. O CI está configurado para executar os testes e a cobertura em
Windows, macOS e Linux.

A cobertura deve atingir pelo menos 80% em linhas, funções, ramificações e
instruções. O relatório HTML fica em `coverage/index.html`, e o resumo em
`coverage/coverage-summary.json`.

Para verificar também estilo, tipos e compilação:

```sh
npm run lint
npm run format:check
npm run typecheck
npm run build
```

Para os testes do Playwright:

```sh
npx playwright install chromium
npm run test:e2e
```

O Playwright inicia seu próprio servidor em memória. Por enquanto, sua suíte
contém um teste HTTP de disponibilidade em `/health`; os fluxos de interface
serão acrescentados com as páginas do sistema.

## Desenvolvimento

Os contratos dos repositórios em memória, as regras dos relatórios e os pontos
de integração das próximas etapas estão em [Fase 3](docs/fase-3.md).
