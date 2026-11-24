-- Tabelas iniciais do Prateleira.
-- Valores monetários ficam em centavos (inteiros) e datas em UTC (timestamptz).

CREATE TABLE products (
  id          TEXT PRIMARY KEY,
  sku         TEXT NOT NULL,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  cost_cents  BIGINT NOT NULL CHECK (cost_cents >= 0),
  min_stock   INTEGER NOT NULL CHECK (min_stock >= 0),
  quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX products_sku_key ON products (sku);
CREATE INDEX products_category_idx ON products (category);

CREATE TABLE movements (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products (id),
  type        TEXT NOT NULL CHECK (type IN ('ENTRADA', 'SAIDA', 'AJUSTE')),
  quantity    INTEGER NOT NULL CHECK (quantity >= 0),
  reason      TEXT NOT NULL DEFAULT '',
  date        TIMESTAMPTZ NOT NULL
);

CREATE INDEX movements_product_date_idx ON movements (product_id, date);
CREATE INDEX movements_date_idx ON movements (date);
