# Prateleira

[![CI](https://github.com/Drefus/estoquei/actions/workflows/ci.yml/badge.svg)](https://github.com/Drefus/estoquei/actions/workflows/ci.yml)

Controle de estoque simples desenvolvido para a disciplina de Engenharia de Software 2.

## Integrantes

<!-- PREENCHER: nome completo e matrícula de cada integrante. -->

- _Nome completo do integrante 1_ (matrícula _xxxxxxxxxx_)
- _Nome completo do integrante 2_ (matrícula _xxxxxxxxxx_)

## Sobre o sistema

O Prateleira é um controle de estoque para pequenos negócios. Ele registra os
produtos, cada entrada e saída de mercadoria e mostra o que precisa ser reposto.
O saldo de um produto só muda por movimentações, e cada movimentação fica no
histórico.

### Funcionalidades

- **Cadastro de produtos** com SKU único, nome, categoria, preço de custo e
  estoque mínimo. Os dados são validados e os erros aparecem abaixo de cada campo.
- **Edição e desativação** de produtos. Desativar não apaga o produto nem o
  histórico, mas bloqueia novas movimentações.
- **Movimentações:** entrada, saída e ajuste de inventário (que define o novo
  saldo e exige motivo). Uma saída nunca deixa o saldo negativo.
- **Histórico** de movimentações de cada produto, da mais recente para a mais antiga.
- **Lista de produtos** com busca por nome ou SKU, filtro por categoria e filtro
  "somente estoque baixo".
- **Painel** com valor total do estoque (custo × quantidade dos produtos ativos),
  número de produtos ativos, itens com estoque baixo, gráfico de entradas e saídas
  dos últimos 7 dias e tabela de estoque baixo ordenada pelo maior déficit.
- **Exportação CSV** das movimentações de um período.
- **API JSON** com os mesmos recursos, descrita em [API e serviço de estoque](docs/api.md).

Valores em dinheiro são guardados em centavos (inteiros) para evitar erros de
arredondamento. As escritas são transacionais: se uma movimentação falhar, nem o
saldo nem o histórico mudam.

### Páginas

| Página                                   | Conteúdo                                                            |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `/`                                      | Painel com indicadores, gráfico, estoque baixo e download do CSV.   |
| `/produtos`                              | Lista com busca, filtros e ações de editar, movimentar e desativar. |
| `/produtos/novo`, `/produtos/:id/editar` | Formulário de produto, com preço digitado em reais.                 |
| `/produtos/:id`                          | Dados, saldo, registro de movimentação e histórico.                 |

### Arquitetura

```
src/
  domain/        regras puras: produto, movimentação, saldo, relatórios, erros
  repositories/  interfaces e implementações em memória e PostgreSQL
  services/      InventoryService: orquestra domínio e repositórios em transações
  http/          rotas da API, tratamento de erros e páginas (http/pages)
  views/         templates EJS
  public/        CSS e o script do gráfico
  db/            migrações, conexão e dados de exemplo
db/migrations/   scripts SQL versionados
```

A variável `STORAGE` escolhe o armazenamento: `memory` (padrão, usado em testes
e no CI) ou `postgres` (produção, com `DATABASE_URL`).

### Executar localmente

```sh
npm ci
npm run dev
```

Acesse `http://localhost:3000`. Nesse modo os dados ficam em memória e são
perdidos ao reiniciar o servidor.

## Produção

- **Sistema publicado:** <!-- PREENCHER: https://prateleira-xxxx.onrender.com -->
  _link a preencher após o primeiro deploy no Render_

> O serviço usa o plano gratuito do Render, que **hiberna** depois de cerca de
> 15 minutos sem acesso. O primeiro acesso depois disso pode demorar perto de um
> minuto. Os dados ficam no PostgreSQL do Neon e não se perdem na hibernação.

O passo a passo do deploy (Neon, Render, dados de exemplo e roteiro de teste)
está em [Deploy em produção](docs/deploy.md).

## Tecnologias

| Ferramenta                  | O que faz no projeto                                                                    | Por que foi escolhida                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Node.js 20 + TypeScript** | Executa o servidor; os tipos estritos verificam o código antes de rodar.                | Uma só linguagem no servidor, nos testes e nos scripts; o modo estrito pega erros cedo.                    |
| **Express**                 | Rotas da API e das páginas, leitura de formulários e JSON, tratamento central de erros. | Simples e conhecido; permite separar `createApp` da inicialização e testar o app sem abrir porta.          |
| **EJS**                     | Renderiza as páginas HTML no servidor.                                                  | Templates em HTML comum, sem framework de frontend nem etapa de build; as regras ficam no servidor.        |
| **Chart.js (CDN)**          | Gráfico de barras de entradas e saídas no painel.                                       | Um único arquivo via CDN, sem instalação; se não carregar, o painel ainda mostra os totais em texto.       |
| **PostgreSQL + pg**         | Guarda produtos e movimentações em produção, com migrações SQL versionadas.             | Banco relacional com índice único e chave estrangeira; o `pg` é o driver mais usado no Node.               |
| **Vitest + coverage-v8**    | Testes de unidade e de integração; mede a cobertura com limite de 80%.                  | Rápido, com suporte nativo a TypeScript e ESM, e cobertura sem instrumentar o código.                      |
| **Supertest**               | Faz requisições HTTP ao app nos testes de API e de páginas.                             | Testa rotas, status e HTML sem subir servidor.                                                             |
| **Playwright**              | Testes end to end no Chromium, simulando o uso real das páginas.                        | Seletores por papel e rótulo, espera automática e relatório com trace em caso de falha.                    |
| **ESLint + Prettier**       | Padroniza estilo e aponta problemas comuns no código.                                   | Evita discussões de formatação e é verificado no CI.                                                       |
| **GitHub Actions**          | CI em Linux, macOS e Windows: lint, formatação, build, testes, cobertura e e2e.         | Integrado ao GitHub e gratuito para repositórios públicos; a matriz revela cedo problemas de cada sistema. |
| **Render + Neon**           | Hospedagem do app e do banco.                                                           | Ambos têm plano gratuito; o Render faz deploy a partir do repositório usando o `render.yaml`.              |

## Uso de IA

<!--
PREENCHER: revisem e completem esta seção com as palavras de vocês.
Sugestão de estrutura: ferramentas usadas, em quais fases, como revisaram e o que
precisou ser corrigido. Exemplos concretos valem mais que descrições genéricas.
-->

### Ferramentas

| Ferramenta         | Quem usou   | Fases                                                                               |
| ------------------ | ----------- | ----------------------------------------------------------------------------------- |
| Codex              | _preencher_ | Relatórios, repositórios em memória, transações, serviço, API HTTP e exportação CSV |
| Claude Code        | _preencher_ | Adaptador PostgreSQL, páginas EJS, testes e2e, CI de cobertura e e2e, deploy        |
| _outra, se houver_ | _preencher_ | _preencher_                                                                         |

### Como a IA foi usada

O Codex apoiou a implementação dos relatórios, repositórios em memória,
transações, serviço de estoque, endpoints HTTP e exportação CSV. Também foi
utilizado para escrever testes de comportamento, executar verificações locais
e documentar os contratos entre as camadas.

O Claude Code apoiou o adaptador PostgreSQL com migrações e testes de
integração, as páginas EJS (painel, lista, formulários e página do produto), os
testes end to end, as etapas de cobertura e e2e no CI e a preparação do deploy.
As páginas foram conferidas em navegador, em largura de desktop e de celular,
antes dos commits.

Em todas as fases, os prompts seguiram um contexto fixo (stack, arquitetura,
regras de commit) e uma descrição da fase, e cada passo terminou com lint,
testes e cobertura antes do commit.

### Como revisamos o que foi gerado

<!-- PREENCHER com exemplos reais. Itens que podem ajudar: -->

- _Leitura de cada diff antes do commit: …_
- _Testes executados localmente e no CI nos três sistemas: …_
- _Exemplo de algo que a IA errou e foi corrigido: …_ (ex.: uma mensagem de erro
  alterada quebrou um teste e foi corrigida no commit `c65ec07`)
- _Decisões que tomamos e a IA apenas implementou: …_

## Execução dos testes

### Pré-requisitos

- Node.js 20 e npm (no Windows, use o instalador de <https://nodejs.org>).
- Git.

Todos os comandos abaixo são iguais em **Windows** (PowerShell ou Prompt de
Comando), **macOS** e **Linux**, e rodam na raiz do repositório. Os scripts usam
`cross-env` para definir variáveis de ambiente em qualquer sistema.

### Instalar

```sh
npm ci
```

### Testes de unidade e integração

```sh
npm test
```

Executa:

- `tests/unit`: testes de unidade do domínio, relatórios, repositórios em
  memória, serviço e funções auxiliares;
- `tests/api`: testes de integração da API JSON e, em `tests/api/pages`, das
  páginas, com Supertest;
- `tests/http`: teste do health check;
- `tests/postgres`: integração com PostgreSQL, ignorada a menos que
  `TEST_DATABASE_URL` esteja definida (veja [PostgreSQL](docs/fase-3.md#postgresql)).

### Cobertura

```sh
npm run test:coverage
```

O comando falha se linhas, funções, ramos ou instruções ficarem abaixo de 80%.
O relatório HTML fica em `coverage/index.html` e o resumo em
`coverage/coverage-summary.json`. Ficam fora da medição apenas a inicialização
do servidor, o código que depende de PostgreSQL real e arquivos só de tipos (a
justificativa está em `vitest.config.ts`).

### Testes end to end

Na primeira vez, instale o Chromium do Playwright:

```sh
npx playwright install chromium
```

No Linux, se faltarem bibliotecas do sistema, use
`npx playwright install --with-deps chromium`.

Depois:

```sh
npm run test:e2e
```

O Playwright sobe o próprio servidor em memória na porta 3100 e executa os
fluxos em `e2e/`. Para ver o navegador durante os testes, use
`npx playwright test --headed`; para abrir o relatório da última execução,
`npx playwright show-report`.

### Estilo, tipos e build

```sh
npm run lint
npm run format:check
npm run typecheck
npm run build
```

### Onde ver a cobertura no CI

O selo no topo deste README mostra o estado da última execução do
[GitHub Actions](https://github.com/Drefus/estoquei/actions/workflows/ci.yml).
Ao abrir uma execução:

- a página **Summary** mostra a tabela "Cobertura de testes" com as quatro
  métricas, gerada no job `ubuntu-latest`;
- a seção **Artifacts** traz o artefato `coverage`, com o relatório HTML
  completo (abra `index.html` depois de baixar), e, se algum e2e falhar, o
  artefato `playwright-report-<sistema>`.

Se qualquer métrica ficar abaixo de 80%, o Vitest falha e a execução fica
vermelha.

## Documentação adicional

- [API e serviço de estoque](docs/api.md): endpoints, códigos de status e exemplos.
- [Repositórios, relatórios e PostgreSQL](docs/fase-3.md): contratos, filtros e migrações.
- [Deploy em produção](docs/deploy.md): Neon, Render e roteiro de teste.
