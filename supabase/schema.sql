-- ============================================================
-- KioscoApp — Schema Supabase
-- Correr en: Supabase > SQL Editor > New query > Run
-- ============================================================

-- VENTAS
create table if not exists sales (
  id              text primary key,
  store_id        text not null default 'default',
  ticket_number   integer not null,
  total           numeric not null,
  subtotal        numeric not null,
  payment_method  text not null,
  status          text not null default 'COMPLETED',
  created_at      timestamptz not null
);
alter table sales disable row level security;

-- ITEMS DE VENTA
create table if not exists sale_items (
  id           text primary key,
  sale_id      text not null references sales(id) on delete cascade,
  product_name text not null,
  quantity     numeric not null,
  unit_price   numeric not null,
  unit_cost    numeric not null,
  subtotal     numeric not null
);
alter table sale_items disable row level security;

-- PRODUCTOS (snapshot del stock)
create table if not exists products (
  id            text primary key,
  store_id      text not null default 'default',
  name          text not null,
  barcode       text,
  stock         numeric not null default 0,
  stock_min     numeric not null default 0,
  unit          text not null default 'un',
  cost          numeric not null default 0,
  price_auto    numeric not null default 0,
  price_manual  numeric,
  use_manual    integer not null default 0,
  category_name text,
  supplier_name text,
  updated_at    timestamptz
);
alter table products disable row level security;

-- CAJAS
create table if not exists cash_registers (
  id                 text primary key,
  store_id           text not null default 'default',
  status             text not null default 'OPEN',
  opening_amount     numeric not null default 0,
  closing_amount     numeric,
  theoretical_amount numeric,
  difference         numeric,
  notes              text,
  opened_at          timestamptz not null,
  closed_at          timestamptz
);
alter table cash_registers disable row level security;

-- MOVIMIENTOS DE CAJA
create table if not exists cash_movements (
  id               text primary key,
  cash_register_id text not null references cash_registers(id) on delete cascade,
  type             text not null,
  amount           numeric not null,
  description      text,
  created_at       timestamptz not null
);
alter table cash_movements disable row level security;

-- ÍNDICES para queries del dashboard
create index if not exists idx_sales_created    on sales(created_at desc);
create index if not exists idx_sales_store      on sales(store_id, created_at desc);
create index if not exists idx_products_stock   on products(stock, stock_min);
create index if not exists idx_cash_reg_status  on cash_registers(status, opened_at desc);
