# Roteiro do vídeo (até 5 minutos)

**Antes de gravar**

- Abra o link de produção uns 2 minutos antes: o Render gratuito hiberna e o primeiro acesso demora.
- Rode `npm run db:seed` apontando para o Neon (veja [deploy](deploy.md)), para o painel já ter dados.
- Deixe abertas as abas: sistema em produção, README no GitHub, última execução verde do Actions
  (com a página Summary) e o editor com `tests/unit`, `e2e/` e `vitest.config.ts`.
- Escolha um SKU que ainda não existe para cadastrar ao vivo, por exemplo `VIDEO-01`.

## 1. Apresentação do sistema (0:00 a 1:00)

| Tempo     | Na tela                                                                   | Fala (resumo)                                                                                      |
| --------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 0:00–0:10 | Painel em produção                                                        | "O Prateleira é um controle de estoque simples, publicado no Render com banco PostgreSQL no Neon." |
| 0:10–0:25 | **Novo produto**: preencher `VIDEO-01`, preço `12,50`, mínimo `5`; Salvar | Cadastro com validação. Mostrar rapidamente um erro (ex.: SKU `ab`) abaixo do campo.               |
| 0:25–0:45 | Página do produto: entrada de 8; depois saída de 20 (erro); saída de 4    | Saldo muda só por movimentação; saída maior que o saldo é bloqueada; histórico registra tudo.      |
| 0:45–1:00 | Voltar ao **Painel**                                                      | Valor total, `VIDEO-01` na tabela de estoque baixo, barras de hoje no gráfico, botão do CSV.       |

## 2. Tecnologias (1:00 a 2:00)

| Tempo     | Na tela                           | Fala (resumo)                                                                                                              |
| --------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1:00–1:25 | Árvore de pastas `src/` no editor | Camadas: domínio puro, repositórios (memória e PostgreSQL), serviço, HTTP e views. `STORAGE` escolhe o banco.              |
| 1:25–1:45 | Tabela "Tecnologias" do README    | Node 20 + TypeScript, Express, EJS e Chart.js; PostgreSQL com `pg`; por que cada um (simplicidade, sem build no frontend). |
| 1:45–2:00 | `render.yaml`                     | Deploy: build, migração no start, health check em `/health`; valores em centavos para evitar erro de arredondamento.       |

## 3. Uso de IA (2:00 a 3:00)

| Tempo     | Na tela                                         | Fala (resumo)                                                                                              |
| --------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 2:00–2:20 | Seção "Uso de IA" do README                     | Quais ferramentas foram usadas e em quais fases.                                                           |
| 2:20–2:45 | Um commit no GitHub (ex.: `git log` ou um diff) | Como trabalhamos: contexto fixo + prompt por fase, commits pequenos, revisão do diff antes de cada commit. |
| 2:45–3:00 | Commit `c65ec07` ou outro exemplo de vocês      | Um caso concreto em que a revisão ou os testes pegaram um erro gerado pela IA e como foi corrigido.        |

## 4. Testes, cobertura e CI (3:00 a 5:00)

| Tempo     | Na tela                                                                   | Fala (resumo)                                                                                                    |
| --------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 3:00–3:30 | `tests/unit/domain/stock.test.ts` (ex.: teste de saída maior que o saldo) | Testes de unidade pela API pública, um comportamento por teste, nomes descritivos ("deve impedir saída maior…"). |
| 3:30–3:50 | Terminal: `npm test`                                                      | Quantidade de testes de unidade e de integração (API e páginas com Supertest), todos em memória.                 |
| 3:50–4:15 | `npx playwright test --headed` (ou o vídeo de uma execução)               | Os testes e2e: cadastro, SKU duplicado, entrada, estoque insuficiente, alerta no painel e busca por SKU.         |
| 4:15–4:35 | `npm run test:coverage` e `vitest.config.ts`                              | Cobertura acima de 80% nas quatro métricas; o CI falha abaixo disso; exclusões justificadas em comentário.       |
| 4:35–5:00 | GitHub Actions: execução verde, matriz com 3 sistemas, Summary, artefatos | Cada commit roda lint, build, cobertura e e2e em Linux, macOS e Windows; tabela de cobertura e relatório HTML.   |

## Links para o Moodle

- Sistema em produção: _preencher_
- Repositório: https://github.com/Drefus/estoquei
- Build mais recente com sucesso: _link da execução verde no Actions_
- Vídeo no YouTube: _preencher_
