-- ============================================================
-- KioscoApp — Migración 002: Multi-tenant (locales + usuarios)
-- Correr después de 001. Ejecutar en: Supabase > SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS stores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_users_store ON store_users(store_id);

-- Vista de conveniencia: store_id del usuario autenticado.
CREATE OR REPLACE VIEW my_store AS
  SELECT su.store_id, su.role, s.name
  FROM store_users su
  JOIN stores s ON s.id = su.store_id
  WHERE su.id = auth.uid();
