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
o servidor. Com `STORAGE=postgres`, os dados ficam no PostgreSQL (veja
[PostgreSQL](docs/fase-3.md#postgresql)).

### Páginas

- **Painel (`/`):** valor total do estoque, produtos ativos, itens com estoque
  baixo, gráfico de entradas e saídas dos últimos 7 dias, tabela de estoque
  baixo e download do CSV de movimentações de um período.
- **Produtos (`/produtos`):** busca por nome ou SKU, filtro por categoria e
  "somente estoque baixo", com ações de editar, movimentar e desativar.
- **Cadastro e edição (`/produtos/novo`, `/produtos/:id/editar`):** preço
  digitado em reais e mensagem de erro abaixo de cada campo inválido.
- **Produto (`/produtos/:id`):** dados, saldo, registro de entrada, saída ou
  ajuste e histórico de movimentações.

As páginas são renderizadas no servidor com EJS e enviam formulários HTML comuns.
O único JavaScript no navegador desenha o gráfico; as regras ficam no servidor.

Para iniciar o sistema localmente:

```sh
npm ci
npm run dev
```

Acesse `http://localhost:3000`. A API JSON (`/api/products`, `/api/dashboard`
e outros) está descrita na [documentação da API](docs/api.md).

## Tecnologias

- **Node.js e TypeScript:** execução no servidor e verificação estática dos tipos.
- **Express:** rotas HTTP, leitura de JSON e tratamento central de erros.
- **Vitest e cobertura V8:** testes unitários e medição com limite mínimo de 80%.
- **Supertest:** testes de integração da API por requisições HTTP.
- **Playwright:** teste atual de disponibilidade e base para os futuros fluxos de interface.
- **GitHub Actions:** lint, formatação, build e testes com cobertura em Linux, macOS e Windows.
- **PostgreSQL com pg:** persistência em produção, com migrações SQL versionadas.
- **EJS:** páginas renderizadas no servidor, sem framework de frontend.
- **Chart.js (CDN):** gráfico de barras de entradas e saídas no painel.

## Uso de IA

O Codex apoiou a implementação dos relatórios, repositórios em memória,
transações, serviço de estoque, endpoints HTTP e exportação CSV. Também foi
utilizado para escrever testes de comportamento, executar verificações locais
e documentar os contratos entre as camadas.

O Claude Code apoiou o adaptador PostgreSQL com migrações e testes de
integração, as páginas EJS (painel, lista, formulários e página do produto) e
seus testes. As páginas foram conferidas em navegador, em largura de desktop e
de celular, antes dos commits.

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
`tests/api` (API JSON e, em `tests/api/pages`, as páginas) e `tests/http`. Os
testes usam armazenamento em memória, configurado pelos scripts com `cross-env`.
Os testes de integração com PostgreSQL em `tests/postgres` só rodam com
`TEST_DATABASE_URL` definida (veja [PostgreSQL](docs/fase-3.md#postgresql)). O CI está configurado para executar os testes e a cobertura em
Windows, macOS e Linux.

A cobertura deve atingir pelo menos 80% em linhas, funções, ramificações e
instruções. O relatório HTML fica em `coverage/index.html`, e o resumo em
`coverage/coverage-summary.json`.

### Onde ver a cobertura no CI

O selo no topo deste README mostra o estado da última execução do
[GitHub Actions](https://github.com/Drefus/estoquei/actions/workflows/ci.yml).
Ao abrir uma execução:

- a página **Summary** mostra a tabela "Cobertura de testes" com as quatro
  métricas, gerada no job `ubuntu-latest`;
- a seção **Artifacts** traz o artefato `coverage`, com o relatório HTML
  completo (abra `index.html` depois de baixar).

Se qualquer métrica ficar abaixo de 80%, o Vitest falha e a execução fica
vermelha.

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

Para concluir a entrega, faltam pelo menos cinco fluxos e2e de interface
executados no CI, a publicação em produção, os nomes completos dos integrantes e
o vídeo de apresentação.
