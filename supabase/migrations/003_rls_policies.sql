-- ============================================================
-- KioscoApp — Migración 003: Row-Level Security
-- CRÍTICO: nunca dejar tablas con RLS disabled en producción.
-- Las apps desktop usan anon key + store_id del usuario logueado (store_users).
-- ============================================================

-- Habilitar RLS y limpiar policies previas (idempotente)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sales','sale_items','products','cash_registers','cash_movements','stores','store_users']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END$$;

-- Helper: verifica que el usuario autenticado pertenezca al store del registro.
CREATE OR REPLACE FUNCTION auth_has_store(target_store TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_users
    WHERE id = auth.uid() AND store_id::text = target_store
  )
$$;

-- ── stores ──
DROP POLICY IF EXISTS stores_select ON stores;
CREATE POLICY stores_select ON stores FOR SELECT
  USING (id IN (SELECT store_id FROM store_users WHERE id = auth.uid()));

-- ── store_users ──
DROP POLICY IF EXISTS store_users_select ON store_users;
CREATE POLICY store_users_select ON store_users FOR SELECT
  USING (id = auth.uid() OR store_id IN (SELECT store_id FROM store_users WHERE id = auth.uid()));

-- ── sales / sale_items / products / cash_* ──
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sales','products','cash_registers','cash_movements'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %1$s_rw ON %1$s', t);
    EXECUTE format('CREATE POLICY %1$s_rw ON %1$s FOR ALL USING (auth_has_store(store_id)) WITH CHECK (auth_has_store(store_id))', t);
  END LOOP;
END$$;

-- sale_items no tiene store_id — derivar vía sales
DROP POLICY IF EXISTS sale_items_rw ON sale_items;
CREATE POLICY sale_items_rw ON sale_items FOR ALL
  USING (EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id AND auth_has_store(s.store_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id AND auth_has_store(s.store_id)));
