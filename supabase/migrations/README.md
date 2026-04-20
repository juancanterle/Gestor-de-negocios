# Supabase migrations

Orden de ejecución (Supabase > SQL Editor):

1. `001_initial_schema.sql` — tablas base (ventas, productos, caja)
2. `002_multi_tenant.sql` — locales + usuarios por local
3. `003_rls_policies.sql` — **crítico**: habilita RLS y fuerza aislamiento por `store_id`
4. `004_purchases_audit.sql` — compras + audit remoto

Los archivos `schema.sql` y `schema_v2.sql` en el nivel superior quedan como referencia histórica y **no deben ejecutarse** en instalaciones nuevas.

## Smoke test de RLS

Después de aplicar 003:

```sql
-- Como usuario anónimo, NO debería retornar filas de otro store:
SELECT * FROM sales LIMIT 1;

-- Como usuario autenticado con store A, solo debería ver filas de store A.
```

Si `SELECT * FROM sales` devuelve filas sin auth, RLS no está forzado — revisar que `FORCE ROW LEVEL SECURITY` se haya aplicado.
