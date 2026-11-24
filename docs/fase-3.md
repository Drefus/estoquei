# Fase 3: repositórios em memória e relatórios

Esta etapa implementa os contratos de persistência, os adaptadores em memória e
os quatro relatórios de domínio. A integração com `InventoryService` e as rotas
está descrita em [API e serviço de estoque](api.md). O adaptador PostgreSQL está
descrito em [PostgreSQL](#postgresql).

## Produtos

O contrato está em `src/repositories/productRepository.ts`, e o adaptador em
`src/repositories/inMemoryProductRepository.ts`.

| Método            | Comportamento                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `save(product)`   | Insere um produto novo; rejeita id ou SKU existente.                                                                                   |
| `update(product)` | Atualiza produto existente; lança `ProductNotFoundError` se o id não existir e `DuplicateSkuError` se o SKU pertencer a outro produto. |
| `findById(id)`    | Retorna o produto ou `null`.                                                                                                           |
| `findBySku(sku)`  | Procura pelo SKU exato e retorna o produto ou `null`.                                                                                  |
| `list(filters)`   | Retorna produtos que atendem a todos os filtros informados, sem garantir ordem.                                                        |

Filtros disponíveis:

- `search`: trecho de nome ou SKU, ignorando espaços nas pontas e diferenças entre maiúsculas e minúsculas.
- `category`: categoria exata, ignorando espaços nas pontas.
- `lowStockOnly`: saldo menor ou igual ao mínimo.
- `activeOnly`: somente produtos ativos.

Filtros de texto vazios e opções booleanas falsas não restringem a consulta.
Sem filtros, a lista inclui produtos ativos e inativos. Para um painel que mostre
somente produtos ativos com estoque baixo, combine `activeOnly` e `lowStockOnly`.

## Movimentações

O contrato está em `src/repositories/movementRepository.ts`, e o adaptador em
`src/repositories/inMemoryMovementRepository.ts`.

| Método                     | Comportamento                                                            |
| -------------------------- | ------------------------------------------------------------------------ |
| `save(movement)`           | Insere uma movimentação nova; rejeita id existente.                      |
| `listByProduct(productId)` | Retorna o histórico do produto, ou uma lista vazia.                      |
| `listByPeriod(start, end)` | Retorna todas as movimentações dos dias selecionados, incluindo ajustes. |

As consultas retornam movimentações em ordem crescente de data, com desempate
pelo id. O futuro método `InventoryService.getProductHistory` deve ordenar o
histórico em ordem decrescente para apresentação.

Nos dois adaptadores, gravações e leituras fazem cópias dos objetos e das datas.
Alterar um objeto recebido em uma consulta não altera os registros armazenados.
As interfaces são assíncronas para permitir implementações PostgreSQL.

A existência do produto e a aplicação das regras de estoque pertencem ao serviço
e ao domínio. Os repositórios recebem dados já validados.

## Relatórios de estoque

As funções estão em `src/domain/reports/stock.ts`.

- `totalStockValue(products)`: soma quantidade multiplicada pelo custo em centavos, considerando somente produtos ativos.
- `lowStockList(products)`: lista produtos ativos com saldo menor ou igual ao mínimo, ordenando pelo maior déficit e depois pelo SKU.

As funções não alteram a lista nem os produtos recebidos.

## Relatórios de movimentação

As funções estão em `src/domain/reports/movements.ts`.

`movementSummary(movements, start, end)` retorna:

```ts
interface MovementSummary {
  totalEntries: number;
  totalExits: number;
  daily: {
    date: string; // YYYY-MM-DD em UTC
    entries: number;
    exits: number;
    balance: number;
  };
  [];
}
```

Os totais somam as quantidades movimentadas. A lista diária é cronológica e inclui
dias sem movimentação, com valores zero. `balance` é a diferença entre entradas
e saídas do dia; pode ser negativo e não representa o estoque acumulado.

`AJUSTE` define um saldo absoluto de inventário. Por isso, não é somado como
entrada ou saída nesse relatório. Ele permanece disponível no histórico e na
consulta por período.

`topMovedProducts(movements, limit)` soma somente as saídas por produto e retorna
`{ productId, quantity }[]`, ordenado pela quantidade decrescente e depois pelo
id do produto. O limite deve ser inteiro e não negativo. Quem chama fornece as
movimentações já filtradas para o período desejado.

## Datas e períodos

Os relatórios e a consulta por período consideram dias completos em UTC,
incluindo os dias inicial e final. Horários presentes nos argumentos não
restringem esses dias. Por exemplo, selecionar 15 a 17 de janeiro inclui de
`2026-01-15T00:00:00.000Z` até antes de `2026-01-18T00:00:00.000Z`.

O helper `getUtcDayPeriod`, em `src/domain/period.ts`, fornece esses limites sem
alterar as datas recebidas. Datas inválidas ou período invertido causam
`RangeError`. A interpretação em UTC mantém o resultado independente do fuso
configurado no computador ou no CI.

## PostgreSQL

Com `STORAGE=postgres` e `DATABASE_URL` definidas, `src/server.ts` monta o
`InventoryService` sobre `PostgresInventoryStore` (em `src/repositories/postgres`).
Os adaptadores seguem os mesmos contratos e filtros dos repositórios em memória:

- `DuplicateSkuError` vem da violação do índice único `products_sku_key`.
- A busca usa `strpos` em minúsculas, então `%` e `_` digitados não viram curingas.
- `listByPeriod` usa os mesmos dias completos em UTC de `getUtcDayPeriod`.
- `transaction` abre uma transação dedicada e obtém um `pg_advisory_xact_lock`,
  serializando as escritas como o armazenamento em memória. Assim, duas saídas
  simultâneas não leem o mesmo saldo. Qualquer erro faz `ROLLBACK`.

### Migrações

Os arquivos `db/migrations/NNN_nome.sql` são aplicados em ordem pelo nome, cada
um em sua transação, e registrados na tabela `schema_migrations`. Rodar de novo
não reaplica nada. O script usa o código compilado:

```sh
npm run build
DATABASE_URL=postgres://... npm run db:migrate
```

### Testes de integração

Os testes em `tests/postgres` rodam somente com `TEST_DATABASE_URL` definida,
porque apagam os dados das tabelas. Sem ela, aparecem como ignorados. Para rodar
com um Postgres temporário em Docker:

```sh
docker run -d --rm --name prateleira-pg -e POSTGRES_PASSWORD=teste -p 55432:5432 postgres:16-alpine
TEST_DATABASE_URL=postgres://postgres:teste@localhost:55432/postgres npx vitest run tests/postgres
docker stop prateleira-pg
```

No Windows (PowerShell), defina a variável antes com
`$env:TEST_DATABASE_URL = "postgres://postgres:teste@localhost:55432/postgres"`.

Os adaptadores e o executor de migrações ficam fora da cobertura (ver
`vitest.config.ts`), pois o CI usa apenas `STORAGE=memory`.

Para executar as verificações locais, consulte a seção
[Execução dos testes](../README.md#execução-dos-testes) do README.
