-- ============================================================
-- KioscoApp — Migración 001: Schema inicial (datos de venta/inventario)
-- Correr en: Supabase > SQL Editor > New query > Run
-- NOTA: RLS se habilita en 003_rls_policies.sql — no dejar tablas abiertas.
-- ============================================================

CREATE TABLE IF NOT EXISTS sales (
  id              TEXT PRIMARY KEY,
  store_id        TEXT NOT NULL DEFAULT 'default',
  ticket_number   INTEGER NOT NULL,
  total           NUMERIC NOT NULL,
  subtotal        NUMERIC NOT NULL,
  payment_method  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'COMPLETED',
  created_at      TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sale_items (
  id           TEXT PRIMARY KEY,
  sale_id      TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity     NUMERIC NOT NULL,
  unit_price   NUMERIC NOT NULL,
  unit_cost    NUMERIC NOT NULL,
  subtotal     NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id            TEXT PRIMARY KEY,
  store_id      TEXT NOT NULL DEFAULT 'default',
  name          TEXT NOT NULL,
  barcode       TEXT,
  stock         NUMERIC NOT NULL DEFAULT 0,
  stock_min     NUMERIC NOT NULL DEFAULT 0,
  unit          TEXT NOT NULL DEFAULT 'un',
  cost          NUMERIC NOT NULL DEFAULT 0,
  price_auto    NUMERIC NOT NULL DEFAULT 0,
  price_manual  NUMERIC,
  use_manual    INTEGER NOT NULL DEFAULT 0,
  category_name TEXT,
  supplier_name TEXT,
  updated_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cash_registers (
  id                 TEXT PRIMARY KEY,
  store_id           TEXT NOT NULL DEFAULT 'default',
  status             TEXT NOT NULL DEFAULT 'OPEN',
  opening_amount     NUMERIC NOT NULL DEFAULT 0,
  closing_amount     NUMERIC,
  theoretical_amount NUMERIC,
  difference         NUMERIC,
  notes              TEXT,
  opened_at          TIMESTAMPTZ NOT NULL,
  closed_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cash_movements (
  id               TEXT PRIMARY KEY,
  store_id         TEXT NOT NULL DEFAULT 'default',
  cash_register_id TEXT NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  type             TEXT NOT NULL,
  amount           NUMERIC NOT NULL,
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_created    ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_store      ON sales(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale  ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_products_store   ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_stock   ON products(stock, stock_min);
CREATE INDEX IF NOT EXISTS idx_cash_reg_status  ON cash_registers(store_id, status, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_mov_reg     ON cash_movements(cash_register_id, created_at);
