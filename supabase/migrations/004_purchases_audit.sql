-- ============================================================
-- KioscoApp — Migración 004: Compras + audit log remoto
-- ============================================================

CREATE TABLE IF NOT EXISTS purchases (
  id          TEXT PRIMARY KEY,
  store_id    TEXT NOT NULL DEFAULT 'default',
  supplier_id TEXT,
  total_cost  NUMERIC NOT NULL DEFAULT 0,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'CONFIRMED',
  created_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_purchases_store ON purchases(store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_log_remote (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    TEXT NOT NULL,
  user_id     TEXT,
  user_name   TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_remote_store ON audit_log_remote(store_id, created_at DESC);

-- RLS
ALTER TABLE purchases          ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases          FORCE  ROW LEVEL SECURITY;
ALTER TABLE audit_log_remote   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_remote   FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purchases_rw ON purchases;
CREATE POLICY purchases_rw ON purchases FOR ALL
  USING (auth_has_store(store_id)) WITH CHECK (auth_has_store(store_id));

DROP POLICY IF EXISTS audit_log_remote_rw ON audit_log_remote;
CREATE POLICY audit_log_remote_rw ON audit_log_remote FOR ALL
  USING (auth_has_store(store_id)) WITH CHECK (auth_has_store(store_id));
