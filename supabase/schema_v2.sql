-- ============================================================
-- KioscoApp — Migración v2: Multi-tenant
-- Correr en: Supabase > SQL Editor > New query > Run
-- ============================================================

-- LOCALES (cada kiosco/negocio)
CREATE TABLE IF NOT EXISTS stores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- USUARIOS POR LOCAL (vincula Supabase Auth con un local)
CREATE TABLE IF NOT EXISTS store_users (
  id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role     TEXT NOT NULL DEFAULT 'owner'
);

CREATE INDEX IF NOT EXISTS idx_store_users_store ON store_users(store_id);
