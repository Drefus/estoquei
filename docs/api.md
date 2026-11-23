# API e serviço de estoque

## Organização

`InventoryService` recebe um `InventoryStore`, um relógio e um gerador de ids por
injeção. O domínio valida as regras e aplica movimentações. Os repositórios
armazenam os registros. As rotas validam os tipos das requisições, chamam o
serviço e serializam a resposta.

O adaptador atual, `InMemoryInventoryStore`, executa cada escrita sobre cópias dos
dois repositórios. Confirma o novo estado somente se toda a operação terminar com
sucesso. Uma fila serializa escritas concorrentes, inclusive tentativas de usar
o mesmo SKU ou de retirar o mesmo saldo. As consultas veem o estado confirmado.

As implementações PostgreSQL devem implementar `InventoryStore` e fornecer
repositórios vinculados à transação em execução, com as restrições e a proteção
de concorrência correspondentes no banco. Esse adaptador ainda está pendente.

`createApp({ config, inventory })` permite injetar o serviço nos testes e na
composição da aplicação. Sem serviço explícito, cria uma instância em memória
por aplicativo. Solicitar `STORAGE=postgres` sem adaptador causa erro de
inicialização, evitando usar memória silenciosamente.

## Endpoints

| Método | Caminho                                                       | Sucesso | Resposta                                                                    |
| ------ | ------------------------------------------------------------- | ------- | --------------------------------------------------------------------------- |
| GET    | `/health`                                                     | 200     | `{ "status": "ok" }`                                                        |
| GET    | `/api/products`                                               | 200     | Lista de produtos.                                                          |
| POST   | `/api/products`                                               | 201     | Produto cadastrado.                                                         |
| PUT    | `/api/products/:id`                                           | 200     | Produto atualizado.                                                         |
| DELETE | `/api/products/:id`                                           | 204     | Sem corpo; desativa o produto.                                              |
| POST   | `/api/products/:id/movements`                                 | 201     | `{ product, movement }`.                                                    |
| GET    | `/api/products/:id/movements`                                 | 200     | `{ product, movements }`, com histórico do mais recente para o mais antigo. |
| GET    | `/api/dashboard`                                              | 200     | Indicadores de estoque e resumo diário.                                     |
| GET    | `/api/reports/movements.csv?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` | 200     | Arquivo CSV para download.                                                  |

## Cadastro e edição

Envie `Content-Type: application/json`. POST e PUT recebem os cinco campos:

```json
{
  "sku": "CAF-500",
  "name": "Café torrado 500g",
  "category": "Mercearia",
  "costCents": 1999,
  "minStock": 5
}
```

Preço é informado em centavos inteiros. SKU deve ter de 3 a 20 caracteres,
usando letras maiúsculas, números e hífen. Nome é obrigatório, com até 100
caracteres; custo e estoque mínimo devem ser inteiros não negativos.

O servidor gera `id` e `createdAt`. Produtos começam ativos, com saldo zero.
Campos adicionais, como `quantity` ou `active`, são rejeitados. PUT exige todos
os campos do cadastro e preserva saldo, identidade, data e situação do produto.

Desativar mantém o produto e seu histórico. Um produto inativo continua
reservando seu SKU e não aceita novas movimentações. Repetir a desativação é
permitido.

GET `/api/products` aceita os filtros combináveis:

- `search`: busca parcial por nome ou SKU, sem diferenciar maiúsculas e minúsculas.
- `category`: categoria exata.
- `lowStockOnly=true|false`: saldo menor ou igual ao mínimo.
- `activeOnly=true|false`: somente produtos ativos.

Sem filtros, a consulta inclui ativos e inativos. Filtros desconhecidos, valores
booleanos diferentes de `true` ou `false` e parâmetros repetidos são rejeitados.

## Movimentações

Exemplo de entrada:

```json
{
  "type": "ENTRADA",
  "quantity": 10,
  "reason": "Compra do fornecedor"
}
```

`ENTRADA` e `SAIDA` exigem quantidade inteira positiva. Saídas não podem exceder
o saldo. `reason` é opcional nesses dois tipos.

`AJUSTE` define o saldo absoluto, aceita zero e exige motivo:

```json
{
  "type": "AJUSTE",
  "quantity": 3,
  "reason": "Contagem do inventário"
}
```

A movimentação e a atualização do produto são confirmadas juntas. Se a gravação
falhar, ambas são desfeitas. O serviço verifica o saldo dentro da transação para
impedir que duas saídas simultâneas consumam as mesmas unidades.

## Painel e datas

GET `/api/dashboard` retorna:

- `stockValueCents`: valor do estoque ativo em centavos.
- `activeProductCount`: quantidade de produtos ativos.
- `lowStockCount` e `lowStockProducts`: produtos ativos com estoque baixo, ordenados pelo maior déficit e depois pelo SKU.
- `movementSummary`: totais e lista `daily`, com `date`, `entries`, `exits` e `balance`.

O gráfico cobre o dia do relógio do servidor e os seis anteriores, em UTC,
incluindo dias sem movimento. `balance` significa entradas menos saídas naquele
dia, não estoque acumulado. Ajustes ficam no histórico, mas não são somados como
entradas ou saídas. Movimentações de produtos posteriormente desativados
continuam no resumo histórico.

Datas na API são serializadas em ISO 8601. Na exportação, `inicio` e `fim` usam
`YYYY-MM-DD`, representam dias UTC completos e são inclusivos. Datas inexistentes,
períodos invertidos ou parâmetros ausentes resultam em 400.

## CSV

O arquivo tem as colunas `id,produtoId,tipo,quantidade,motivo,data`, separador
vírgula e fins de linha CRLF. Inclui entradas, saídas e ajustes do período.
Os valores ficam entre aspas; aspas internas são duplicadas e quebras de linha
permanecem dentro da célula.

Textos que parecem fórmulas recebem um tab dentro da célula entre aspas. O motivo
original permanece intacto no histórico. Esse tratamento é voltado à abertura
em planilhas e introduz um caractere no valor exportado; não deve ser removido
automaticamente por um importador sem considerar seu destino. A
[OWASP descreve a técnica e seus limites](https://community.owasp.org/attacks/CSV_Injection).

## Erros

Respostas de erro usam a estrutura:

```json
{
  "error": {
    "code": "INVALID_PRODUCT",
    "message": "Produto inválido: Nome é obrigatório.",
    "issues": ["Nome é obrigatório."]
  }
}
```

`issues` aparece nos erros de validação. Os status são:

- **400:** entrada inválida, JSON malformado ou período inválido.
- **404:** produto inexistente ou rota desconhecida.
- **409:** SKU duplicado, estoque insuficiente ou produto inativo.
- **413:** corpo JSON maior que 100 KB.
- **500:** falha interna, sem exposição de detalhes técnicos.

As rotas assíncronas usam o encaminhamento de rejeições do
[Express 5](https://expressjs.com/en/guide/error-handling/) para o middleware
central de erros.

## Verificações e próximos passos

Os testes unitários cobrem domínio, relatórios, repositórios, transações,
serviço e validação de entradas. Os testes de integração da API ficam em
`tests/api`, e os primeiros testes de disponibilidade HTTP em `tests/http`.

O teste atual do Playwright confirma que o servidor inicia e responde a
`/health`. Ainda é necessário implementar os fluxos de navegação pela interface,
executá-los no CI nos três sistemas, concluir PostgreSQL e publicar a aplicação.
Os comandos de verificação estão no [README](../README.md#execução-dos-testes).
