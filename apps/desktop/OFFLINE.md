# Offline-first — Estrategia de sincronización

La app es **offline-first por diseño**: toda escritura va primero a SQLite local
(vía `better-sqlite3` en el main de Electron). El cajero nunca ve latencia de red
porque la UI responde sobre la DB local. Un worker en background sincroniza
pendientes con Supabase cuando hay conexión.

```
Cajero → UI → IPC ──► SQLite (local, siempre)
                          │
                          ▼
                      outbox/queue ──► Worker sync ──► Supabase
                                          ▲
                                          └── online events + polling
```

---

## Estado actual de implementación

### Capa 1 — "offline con indicador" ✅ implementada

**Track A (este repo — `apps/desktop/src/**`)**

- `src/hooks/useSyncStatus.ts` — polling a `sync.status()` cada 10s + listeners
  `online/offline` del navegador + detección de transiciones para toasts.
- `src/components/SyncIndicator.tsx` — badge visible en el sidebar con 5 estados:
  Sincronizado / Sincronizando / Pendientes / Offline / Error.
- `src/components/SyncDetailsModal.tsx` — modal con estado completo (online,
  pending, failed, último sync, último error) + botón "Sincronizar ahora".
- Toast automático al recuperar la conexión: *"Sincronización completa: N items"*.
- Panel de sync en `SettingsScreen` con botón manual + info de estado.

**Track B (pendiente en `apps/desktop/electron/**`)**

- [ ] Worker que procesa la outbox cuando `sync.status().online === true`.
- [ ] Escuchar `online`/`offline` en el main process y disparar `sync.manual()`
      al volver a haber red.
- [ ] FIFO estricto en la cola + *skip + marcar failed* cuando un item envenena
      la cola (para que no bloquee el resto).
- [ ] Política de conflictos: **last-write-wins por `updated_at`**.

---

### Capa 2 — "robusto para multi-kiosco" 🚧 parcial

**Track A ✅**

- UI tolera el shape completo de `SyncStatus` (incluyendo `failed`, `lastError`).
- El modal muestra `lastError` cuando existe, con código de error si viene.
- `useSyncStatus` detecta recovery de `failed > 0 → 0` (se puede exponer un toast
  específico cuando Track B emita ese evento).

**Track B (pendiente) ⏳**

- [ ] **Topological sort** de la outbox: `products` → `sales` → `sale_items` que
      los referencian. Si una venta depende de un producto nuevo creado offline,
      subir el producto primero.
- [ ] **Server-side timestamps** o sync NTP al startup: evitar que reloj mal del
      kiosco ensucie `created_at`. Recomendación: el server ignora el
      `created_at` del cliente para rows nuevas y usa el suyo.
- [ ] **Migrations versionadas** con `PRAGMA user_version` de SQLite. Si el
      dashboard cambia el schema mientras el kiosco está offline, al reconectar
      aplicar migrations idempotentes antes de sincronizar.
- [ ] **Conflict log** — tabla local `sync_conflicts` con `{row_id, table,
      local_version, server_version, resolved_at}` y endpoint `conflicts.list()`
      para que Track A lo renderice en una pantalla dedicada.
- [ ] **Dead-letter queue** — items failed tras N retries van a esta cola y
      alertan al dueño (toast en Track A + email desde Supabase Edge Function).

---

## Capa 3 — "empresa-grade" 🗓️ futuro (no implementada)

Ideas para cuando el negocio lo justifique (múltiples kioscos, alta rotación,
manejo de efectivo importante):

### 1. Cifrado de la DB local — SQLCipher

La DB actual guarda *toda* la historia del negocio en claro. Si roban la PC del
kiosco, el atacante tiene ventas, precios, clientes.

- Migrar de `better-sqlite3` → `@journeyapps/sqlcipher` (o similar).
- Derivar la key del PIN del dueño (PBKDF2) + salt guardado en keychain del OS.
- Re-cifrar DB existente con `PRAGMA rekey` en un startup de migración.
- **Costo**: mediano. Toca Track B y requiere testing de performance (SQLCipher
  es ~5-15% más lento que SQLite plain).

### 2. Backups automáticos a USB / red

Si la PC del kiosco se rompe, la DB local se pierde. Supabase tiene copia de lo
*sincronizado*, pero no de los pending.

- Cron job cada 30min que copia el `.db` a un USB / NAS / carpeta de red.
- Rotar 7 días × 24 backups.
- Usar `backup.create()` que ya existe en `window.api` (ver `src/types/api.d.ts`).
- UI en Settings para restaurar desde backup y configurar destino.
- **Costo**: bajo-medio. Mayor parte es Track B; Track A sólo UI de config.

### 3. Dashboard de conflictos en el panel web

Ver lista de conflictos sincronizados globalmente, permitir al dueño resolver
manualmente ("quedarse con versión del kiosco A" vs "versión del dashboard").

- Endpoint en Supabase + UI en `apps/dashboard/` (no en este repo).
- **Costo**: alto. Requiere diseño de UX delicada.

### 4. Tests de caos

Simular cortes de red, cortes de luz a la mitad de un sync, DBs corruptas, etc.

- Vitest + mock de `navigator.onLine` + corrupción controlada del SQLite.
- CI que corra el scenario `sale→offline→power-cut→reboot→online`.
- **Costo**: alto. Diferible hasta que aparezca un bug de consistencia real.

### 5. Cifrado en tránsito específico para el kiosco

Además del HTTPS de Supabase, firmar cada payload saliente con una key del
kiosco para que el server pueda detectar replays o tampering.

- **Costo**: alto. Sólo relevante si el dueño maneja información muy sensible.

---

## Contrato entre Track A y Track B

Track A asume que Track B respeta el shape tipado de `SyncStatus`:

```ts
interface SyncStatus {
  online:     boolean       // hay red + el server responde health check
  processing: boolean       // hay un sync.manual() o auto corriendo
  pending:    number        // items en la outbox sin subir
  failed:     number        // items que superaron retries
  lastSync:   string | null // ISO timestamp del último sync exitoso
  lastError:  string | null // mensaje del último error (ya traducido al usuario)
}
```

Y que `sync.manual()` nunca bloquea — arranca el worker y devuelve rápido con el
estado inicial del batch.

Si Track B cambia este contrato, actualizar `src/types/api.d.ts` y Track A se
adapta automáticamente (TypeScript avisa en `useSyncStatus.ts` y el modal).
