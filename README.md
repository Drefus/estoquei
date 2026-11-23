# Prateleira

[![CI](https://github.com/Drefus/estoquei/actions/workflows/ci.yml/badge.svg)](https://github.com/Drefus/estoquei/actions/workflows/ci.yml)

Controle de estoque simples desenvolvido para a disciplina de Engenharia de Software 2.

## Integrantes

<!-- Preencher com nome e matrícula. -->

## Sobre o sistema

O Prateleira é um controle de estoque com cadastro, edição e desativação de
produtos, registro de entradas, saídas e ajustes de inventário, histórico,
indicadores de estoque e exportação CSV.

A API HTTP e o armazenamento em memória estão implementados. As escritas são
transacionais: uma falha desfaz alterações de saldo e histórico, e movimentações
simultâneas são serializadas. O armazenamento em memória é reiniciado junto com
o servidor. A persistência PostgreSQL e as páginas EJS são as próximas etapas.

Para iniciar a API local:

```sh
npm ci
npm run dev
```

O servidor usa a porta 3000 por padrão. Consulte `GET /health`,
`GET /api/products` e os demais endpoints descritos na
[documentação da API](docs/api.md).

## Tecnologias

- **Node.js e TypeScript:** execução no servidor e verificação estática dos tipos.
- **Express:** rotas HTTP, leitura de JSON e tratamento central de erros.
- **Vitest e cobertura V8:** testes unitários e medição com limite mínimo de 80%.
- **Supertest:** testes de integração da API por requisições HTTP.
- **Playwright:** teste atual de disponibilidade e base para os futuros fluxos de interface.
- **GitHub Actions:** lint, formatação, build e testes com cobertura em Linux, macOS e Windows.
- **EJS e PostgreSQL com pg:** dependências previstas para as próximas etapas de interface e persistência.

## Uso de IA

O Codex apoiou a implementação dos relatórios, repositórios em memória,
transações, serviço de estoque, endpoints HTTP e exportação CSV. Também foi
utilizado para escrever testes de comportamento, executar verificações locais
e documentar os contratos entre as camadas.

As verificações executadas incluem lint, formatação, tipos, compilação, testes
unitários, integração HTTP, cobertura e o teste de disponibilidade do Playwright.
A revisão e a explicação das decisões de implementação cabem aos integrantes.

<!-- Complementar com as ferramentas utilizadas pelo outro integrante e suas contribuições. -->

## Execução dos testes

Com Node.js e npm instalados, execute na raiz do repositório:

```sh
npm ci
npm test
npm run test:coverage
```

`npm test` executa os testes de unidade em `tests/unit` e os testes HTTP em
`tests/api` e `tests/http`. Os testes usam armazenamento em memória, configurado pelos scripts
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

A composição dos serviços, os endpoints e os exemplos de requisições estão em
[API e serviço de estoque](docs/api.md).

Para concluir a entrega, faltam os adaptadores PostgreSQL e migrações, as páginas
EJS, pelo menos cinco fluxos e2e de interface executados no CI, a publicação em
produção, os nomes completos dos integrantes e o vídeo de apresentação.
