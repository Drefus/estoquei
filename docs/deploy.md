# Deploy em produção (Render + Neon)

O app roda como serviço web gratuito no [Render](https://render.com) e guarda os
dados em um PostgreSQL gratuito no [Neon](https://neon.tech). A configuração do
serviço está em [`render.yaml`](../render.yaml).

| Variável       | Valor em produção                   | Para que serve                               |
| -------------- | ----------------------------------- | -------------------------------------------- |
| `STORAGE`      | `postgres`                          | Usa os repositórios PostgreSQL.              |
| `DATABASE_URL` | URL do Neon (com `sslmode=require`) | Conexão com o banco, sempre com SSL.         |
| `PORT`         | definida pelo próprio Render        | Porta em que o servidor escuta.              |
| `NODE_VERSION` | `20`                                | Versão do Node usada no build e na execução. |

## 1. Criar o banco no Neon

1. Entre em <https://console.neon.tech> com a conta do GitHub.
2. Clique em **New Project**. Use o nome `prateleira`, a versão mais recente do
   Postgres e a região mais próxima do Render (por exemplo, **AWS US East (Ohio)**,
   se o serviço do Render ficar em Ohio).
3. No painel do projeto, clique em **Connect**. Escolha o banco `neondb`
   (ou crie um chamado `prateleira`) e o papel padrão.
4. Copie a **connection string**. Ela tem o formato
   `postgresql://usuario:senha@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require`.
   Guarde-a em lugar seguro: ela contém a senha do banco e nunca deve ser
   commitada.

## 2. Criar o serviço no Render

1. Envie o código para o GitHub (`git push`) e confirme que o CI está verde.
2. Entre em <https://dashboard.render.com> com a conta do GitHub.
3. Clique em **New → Blueprint** e selecione o repositório. O Render lê o
   `render.yaml` e propõe o serviço `prateleira` no plano **Free**.
4. Quando o Render pedir o valor de `DATABASE_URL`, cole a connection string do Neon.
5. Clique em **Apply**. O primeiro deploy executa:
   - build: `npm ci && npm run build`;
   - start: `npm run db:migrate && npm start`, que cria as tabelas na primeira vez;
   - health check em `/health`.
6. Acompanhe a aba **Logs** até aparecer
   `Prateleira ouvindo em http://localhost:<porta> (storage=postgres)`.
7. Copie a URL pública do serviço (algo como `https://prateleira-xxxx.onrender.com`)
   e coloque-a na seção [Produção](../README.md#produção) do README.

Sem Blueprint, crie em **New → Web Service** e preencha manualmente os mesmos
comandos de build e start, o health check path `/health` e as variáveis
`STORAGE=postgres`, `NODE_VERSION=20` e `DATABASE_URL`.

## 3. Dados de exemplo (opcional, para o vídeo)

O `db:seed` cadastra seis produtos com movimentações, dos quais alguns ficam com
estoque baixo. Ele não roda no deploy. Para usá-lo, rode na sua máquina,
apontando para o banco do Neon:

```sh
npm ci
npm run build
```

Linux e macOS:

```sh
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" npm run db:seed
```

Windows (PowerShell):

```powershell
$env:DATABASE_URL = "postgresql://...neon.tech/neondb?sslmode=require"
npm run db:seed
Remove-Item Env:DATABASE_URL
```

Rodar de novo não duplica nada: produtos cujo SKU já existe são ignorados.

## 4. Testar em produção

1. Abra `https://<seu-servico>.onrender.com/health`: deve responder `{"status":"ok"}`.
2. Em **Novo produto**, cadastre um produto (ex.: SKU `TESTE-01`, preço `10,00`,
   estoque mínimo `5`).
3. Na página do produto, registre uma **Entrada** de 8 unidades e confira o saldo 8.
4. Registre uma **Saída** de 20: deve aparecer o erro de estoque insuficiente e o
   saldo continua 8.
5. Registre uma **Saída** de 4: o saldo vai a 4 e o produto aparece como estoque baixo.
6. No **Painel**, confira o valor total, o produto na tabela de estoque baixo e as
   barras de hoje no gráfico. Baixe o CSV do período.
7. Recarregue a página depois de alguns minutos. Os dados continuam lá porque
   estão no Neon, e não na memória do servidor.

## Observações do plano gratuito

- O Render **hiberna** o serviço gratuito depois de cerca de 15 minutos sem
  acesso. O primeiro acesso depois disso pode levar perto de um minuto. Abra o
  link um pouco antes de gravar o vídeo ou de apresentar.
- O Neon também suspende o banco ocioso. A primeira consulta pode demorar alguns
  segundos a mais.
