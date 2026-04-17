# Inventario de screens — KioscoApp

Documento de referencia para el rediseño visual completo de las dos apps del monorepo.

---

## Arquitectura general

Monorepo con 2 apps que comparten Supabase como backend:

| App | Stack | Tema | Screens | Uso |
|---|---|---|---|---|
| **Desktop (POS)** | Electron + Vite + React 19 | Dark | 8 | Operación diaria en el local (ventas, caja, stock) |
| **Dashboard (Web)** | Next.js 15 (App Router, SSR) | Light | 4 | Dueños ven métricas + super admin crea locales |

Paleta unificada vía design tokens (ver `kioscoapp-design-system/project/tokens.css`):

```
# Brand (común a ambos temas)
brand-500 #6366f1   indigo — primary action, totales, active nav
accent-sky #38bdf8   focus transitorio, login CTA
success    #22c55e   caja abierta, transferencias cobradas
warning    #f59e0b   stock bajo, "encargado"
danger     #ef4444   destructive, logout

# Desktop POS — tema dark
bg #0f1117   surface #1a1d27   surface-2 #161c2a
border #2a2d3a   text #e2e8f0   text-strong #f5f7fa   text-muted #8b95a9
shell: radial-gradient(ellipse at 30% 0%, #171c2a 0%, #0b0f17 55%, #080b12 100%)

# Dashboard web — tema light
bg #f8fafc   surface #fff   bg-lower #f1f5f9
border #e2e8f0   text #1e293b   text-strong #0f172a   text-muted #64748b
hero: linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #38bdf8 100%)
login: radial-gradient(ellipse at 50% 20%, #2a3345 0%, #1a1f2c 45%, #0f131b 100%) + glass blur
```

Fuente de verdad:
- Desktop: `apps/desktop/src/ui/theme.ts` (tokens como constantes tipadas)
- Dashboard: `apps/dashboard/src/app/tokens.css` (tokens como CSS vars, importado desde `layout.tsx`)

Tipografía: system stack (`-apple-system, "Segoe UI", Roboto…`). Mono (`ui-monospace, SFMono-Regular, Menlo…`) para dinero, IDs y tiempos. Iconos: `lucide-react` en desktop, SVGs inline lucide-style en dashboard (18–20px, stroke 2).

---

## APP 1 — Desktop / Electron POS

Ruta: `apps/desktop/src/`

**Shell (`App.tsx`):** sidebar fijo 180px a la izquierda con logo "KioscoApp" + nombre/rol del usuario + 7 items de navegación + botón "Cambiar usuario" abajo. Área de contenido a la derecha.

Items del sidebar: Venta, Productos, Compras, Proveedores, Caja, Reportes, Config.

### 1. LoginScreen
**Archivo:** `screens/LoginScreen.tsx` (130 L)
**Ruta lógica:** primera pantalla al abrir la app si no hay sesión.

- Card centrada 380px sobre fondo dark.
- Header: logo "KioscoApp" + subtítulo "Ingresá con tu usuario y contraseña".
- Form: input Usuario, input Contraseña, botón "Ingresar" (disabled hasta completar).
- Hint al pie: "Usuario por defecto: Administrador · Contraseña: 1234".
- **Estados:** idle / loading ("Verificando…") / error (alerta roja con fondo `#ef444415`).
- Auth contra SQLite local (no es Supabase).

### 2. POSScreen — CRÍTICA
**Archivo:** `screens/POSScreen.tsx` (423 L)
**Es la pantalla más usada, donde se cobra al cliente.**

Tiene 4 estados mutuamente excluyentes:

**2a. Bloqueado ("sin caja abierta")**
- Mensaje centrado en naranja: "No hay caja abierta" + "Abrí la caja desde el módulo Caja antes de vender."

**2b. Cart (default)**
- Split 2 columnas:
- **Izq (flex):**
  - Input escáner con icono Search + botón lupa (toggle dropdown de búsqueda por nombre). El input de escáner tiene autofocus permanente.
  - Si toggle abierto: input búsqueda + dropdown con hasta 8 resultados (nombre + barcode + precio).
  - Tabla carrito: PRODUCTO / CANT. (botones −/+) / PRECIO / SUBTOTAL / acción eliminar. Empty state: icono ShoppingCart grande + "Escaneá o buscá un producto para empezar".
- **Der (280px):** Card "Productos X — TOTAL $X.XXX" grande + botón primario gigante "Cobrar $X.XXX" (disabled si cart vacío) + botón secundario "Limpiar carrito" (rojo outline).

**2c. Checkout**
- Card modal centrada 420px:
- Título "Confirmar cobro".
- Resumen: "N productos · N unidades" y "Total $X.XXX" (grande, indigo).
- Toggle 2 botones: 💵 Efectivo / 📲 Transferencia (el activo con borde indigo y fondo tintado).
- Si Efectivo: input grande "Monto recibido" + si ≥ total → bloque verde con "Vuelto $X".
- Botones "Volver" / "Confirmar cobro" (verde success).

**2d. Done**
- Centrado: CheckCircle 64px verde + "¡Venta confirmada!" + "Ticket N° X".
- Botones: "Nueva venta" (primario) + "Reimprimir" (outline con icono Printer).

### 3. ProductsScreen
**Archivo:** `screens/ProductsScreen.tsx` (281 L)

**Lista:**
- Header: input búsqueda con icono + select categoría + select proveedor + botón "+ Nuevo producto".
- Tabla full-width: PRODUCTO (nombre + barcode en muted) / CATEGORÍA / PROVEEDOR / COSTO / MARKUP % / PRECIO (indigo, bold) / STOCK (naranja si ≤ mínimo, con subtexto "stock bajo") / acciones (editar, eliminar rojo).
- Empty state: "No se encontraron productos".

**Modal nuevo/editar (560px):**
Grid 2 columnas con bloques separados:
- **Datos básicos:** Nombre * (fullwidth) / Código de barras / Unidad (select) / Categoría / Proveedor.
- **Separador "PRECIOS":** Costo / Markup % / Preview destacado "Precio calculado automático $X.XXX" (indigo) / Checkbox "Usar precio manual" / si checked: input "Precio manual" (borde indigo).
- **Separador "STOCK":** Stock actual / Stock mínimo (alerta).
- Footer: Cancelar / Crear producto (o Guardar cambios).

### 4. PurchasesScreen
**Archivo:** `screens/PurchasesScreen.tsx` (230 L)
**Propósito:** registrar ingreso de mercadería (sube stock y actualiza costo).

**Lista:**
- Header: título + botón "+ Nueva compra".
- Tabla: FECHA / PROVEEDOR / NOTAS / TOTAL (indigo) / ESTADO (pill verde).

**Modal nueva compra (640px):**
- Selector Proveedor (opcional) + input Notas.
- Sección "Agregar producto": buscador con dropdown de resultados.
- Tabla items: PRODUCTO / CANTIDAD (editable) / COSTO UNIT. (editable) / SUBTOTAL / borrar.
- Footer: Total grande + botones Cancelar / Confirmar ingreso.

### 5. SuppliersScreen
**Archivo:** `screens/SuppliersScreen.tsx` (189 L)

**Lista con panel de detalle:**
- Izq (flex): header con "+ Nuevo proveedor" + lista de cards (nombre, contacto, teléfono, iconos editar/eliminar). Card seleccionada con borde indigo.
- Der (320px, condicional): panel detalle con:
  - Card "VENTAS HOY": monto vendido + unidades.
  - Lista "STOCK BAJO" (productos de este proveedor bajo mínimo).
  - Bloque "NOTAS" si las hay.

**Modal nuevo/editar (440px):** Nombre * / Contacto / Teléfono / Notas (textarea).

### 6. CashRegisterScreen
**Archivo:** `screens/CashRegisterScreen.tsx` (279 L)

**6a. Sin caja abierta:**
- Card centrada 380px: icono Unlock + "Abrir caja" + input monto apertura grande + botón "Abrir caja".

**6b. Con caja abierta:**
Split 2 columnas.

- **Izq (300px):**
  - Badge verde "● CAJA ABIERTA".
  - 5 filas monto: Apertura / Ventas efectivo / Transferencias / Ingresos manuales / Egresos manuales.
  - Separador grueso → "Total en caja" (indigo, grande).
  - Botones: "Registrar movimiento" (outline) + "Cerrar caja" (rojo).

- **Der (flex):** 3 vistas alternantes según `view`:
  - `current` (default): tabla movimientos del turno (HORA / TIPO con color / DESCRIPCIÓN / MONTO con signo).
  - `movement`: card centrada con toggle Ingreso verde/Egreso rojo + monto + descripción + Cancelar/Registrar.
  - `close`: card con monto teórico + input "dinero contado" grande centrado + diferencia en pill colorida (verde 0, naranja <$50, rojo >$50) + observaciones + Cancelar/Confirmar cierre (rojo).

### 7. ReportsScreen
**Archivo:** `screens/ReportsScreen.tsx` (257 L)

**Header:** título + toggle período (Hoy / 7 días / 30 días).

**4 KPIs (grid 4 cols):** Ventas totales / Efectivo / Transferencias / Ticket promedio. Cada uno con label uppercase + valor grande + subtexto.

**4 Tabs:**
- **Evolución:** lista de barras horizontales (fecha + bar CSS + monto + ticket count).
- **Productos:** tabla Top 10 (# / PRODUCTO / UNIDADES / TOTAL / MARGEN).
- **Proveedores:** tabla (PROVEEDOR / UNIDADES / TOTAL / barra % + número).
- **Stock bajo:** si no hay → "✓ Todo el stock está en orden". Si hay → tabla (PRODUCTO / STOCK ACTUAL naranja / STOCK MÍNIMO / DIFERENCIA rojo).

### 8. SettingsScreen
**Archivo:** `screens/SettingsScreen.tsx` (176 L)

**Header tabs:** "Configuración del local" | "Usuarios" + botón "Cerrar sesión" (rojo, derecha).

**Tab Local (maxWidth 560):** form 2 cols.
- Nombre negocio (fullwidth) / Dirección / Teléfono / Encabezado ticket (textarea) / Pie ticket (textarea) / Redondeo (select: Sin / $10 / $50 / $100) con hint explicativo.
- Botón "Guardar configuración" (se pone verde "¡Guardado!" 2s al save).

**Tab Usuarios (maxWidth 560):**
- Header: descripción + botón "+ Nuevo usuario".
- Form inline condicional: Nombre / PIN 4 dígitos / Rol (Cajero/Encargado/Dueño) + Cancelar/Crear.
- Lista cards: nombre + "PIN: ••••" + pill de rol colorido.
- Footer: aviso amarillo de seguridad sobre PINs.

---

## APP 2 — Dashboard Web

Ruta: `apps/dashboard/src/app/`
Mobile-first, maxWidth 480-640px. Fondo gris claro, cards blancas.

### 9. LoginPage
**Archivo:** `app/page.tsx`
**Ruta:** `/`

- Fondo radial dark (`--bg-login`) full-screen — única pantalla del dashboard que usa dark. Marca el momento "pre-app".
- Logo lockup arriba: tile 72×72 con gradient indigo→sky + texto "KioscoApp".
- **Glass card** al fondo (380px max) con `backdrop-filter: blur(20px)` sobre la capa translúcida — esta es la única aparición de glass en todo el producto.
- Form: labels caps 10px, inputs translúcidos con borde sky en focus, botón CTA con gradient indigo→sky + glow (`--glow-sky`).
- Error en pill roja con borde tintado.
- Redirige a `/admin` si es super admin, si no a `/dashboard`.

### 10. DashboardPage (Dueño del local)
**Archivo:** `app/dashboard/page.tsx`
**Ruta:** `/dashboard`
**Renderizado:** SSR con Supabase.

Layout mobile-first, maxWidth 480px, fondo `--bg`, cards `--surface`.

- **Greeting header:** "Hola," + nombre del negocio (22px/800/-0.2px letter-spacing) + fecha en español + logout chip.
- **Hero "Ventas hoy"** — la card firma del dashboard. Gradient 135° indigo→indigo-400→sky, círculo blanco translúcido en esquina superior, monto 44px/800 con cents en 22px/600 `opacity 0.7`, `tabular-nums`, label caps 11px. Footer separado por hairline blanca con ticket count + promedio. Shadow `--glow-brand`.
- **Caja card** (blanca, 14px radius): icon tile 42×42 (check verde si abierta, candado gris si cerrada) + título + hora de apertura mono + monto teórico a la derecha 18px/700.
- **Attention card** (condicional, amber, gradient `#fffbeb → #fff`): aparece solo si hay stock bajo. Icon tile ámbar + "N productos necesitan reposición" + subtexto "X sin stock · Y con stock bajo".
- **Mini grid 2 cols:** Efectivo (verde) / Transferencias (sky). Cada una con label caps + monto 20px/700 + dot "hoy" en color.
- **Últimas ventas:** card con hairlines, cada fila con icon tile tintado (banknote verde para cash, smartphone sky para transfer) + "Ticket #N" + método + monto alineado a la derecha + hora mono.
- Sin emojis, SVGs lucide-style inline (18–22px, stroke 2).

### 11. AdminPage (Super admin)
**Archivo:** `app/admin/page.tsx`
**Ruta:** `/admin`

- Header: "KioscoApp" 22px/800 + subtítulo "Panel de administración" + logout chip.
- 2 KPI cards (grid): Locales totales (indigo 28px/800) / Activos (verde 28px/800) con labels caps y números tabular.
- Sección Locales: card con header (label caps + botón "+ Nuevo local" pill indigo con icono plus) y lista de filas:
  - Dot verde (con glow si activo) o gris + nombre
  - Email del dueño
  - Store ID mono en color muy tenue
  - `ToggleStoreButton` como pill (verde para Activar, rojo para Desactivar, con border tintado).

### 12. NewStorePage
**Archivo:** `app/admin/new/page.tsx`
**Ruta:** `/admin/new`

**Estado form:**
- Card 520px con back arrow en tile 36×36 + título "Nuevo local".
- Fields con label caps + input + hint opcional.
- Botón "Crear local" indigo con shadow glow cuando habilitado; gris tintado cuando disabled.
- Error en pill roja con borde tintado.

**Estado éxito (resultado):**
- Icon tile verde con check grande al inicio.
- Título "Local creado" 22px/800 + descripción.
- `<dl>` resumen con 4 filas (Local / Email / Contraseña / Store ID en mono indigo).
- Banner amber con icono alerta: "Guardá estos datos antes de cerrar. La contraseña no se puede recuperar."
- Botones: "Crear otro" (outline) / "Volver al panel" (indigo primary).

---

## Estado del rediseño

### Desktop POS (dark)
Tokens centralizados en `src/ui/theme.ts` + primitives en `src/ui/` (`Button`, `Card`, `Modal`, `Field`, `KPI`, `Pill`, `Table`, `Kbd`, `Toast`, `ScreenShell`, `ConfirmDialog`) + helpers `fmt` (moneda ARS). Sidebar y Header alineados al contrato del design system. Screens legacy con estilos inline todavía migrándose gradualmente.

### Dashboard Web (light + login dark)
Diseño rehecho por completo contra el design system:
- `app/tokens.css` importado desde `layout.tsx` — todos los colores, shadows, gradientes y radios vienen de CSS vars.
- Login: glass card + gradient radial dark + CTA con gradient indigo→sky (única pantalla dark del dashboard).
- Dashboard del dueño: hero gradient "Ventas hoy" 44px/800 con cents 22px/600, caja card con icon tile, attention card ámbar para stock bajo, mini cards para efectivo/transferencias, últimas ventas con icon tiles tintados.
- Admin: KPIs indigo/verde, lista de locales con dots glow, ToggleStoreButton como pill tintada.
- Nueva tienda: form con label caps, success state con check tile + dl + banner ámbar.
- Emojis eliminados (`💵 📲 ⚠️`), reemplazados por SVGs lucide-style inline.

### Pendientes conocidos
1. **Desktop screens legacy** (POS, Products, Purchases, Suppliers, Cash, Reports, Settings): aún tienen estilos inline con el objeto `$` duplicado. Migrar a los tokens + primitives cuando se toque cada pantalla.
2. **Modales con `Escape` + focus trap:** el primitive `Modal` ya existe pero algunos screens usan el patrón viejo.
3. **Confirmaciones nativas `confirm()`:** reemplazar por `ConfirmDialog` en Products y Suppliers.
4. **Tailwind instalado pero sin usar** en desktop (el design system favorece tokens tipados sobre utility classes — considerar removerlo).
5. **Contraste WCAG:** el token `--text-dim` (`#64748b`) roza el límite 4.5:1 en dark. Usar `--text-muted` para texto operativo, reservar `--text-dim` para meta secundaria.

---

## Rutas de archivos (para referencia rápida)

### Desktop
```
apps/desktop/src/App.tsx                       shell + sidebar
apps/desktop/src/screens/LoginScreen.tsx       1
apps/desktop/src/screens/POSScreen.tsx         2
apps/desktop/src/screens/ProductsScreen.tsx    3
apps/desktop/src/screens/PurchasesScreen.tsx   4
apps/desktop/src/screens/SuppliersScreen.tsx   5
apps/desktop/src/screens/CashRegisterScreen.tsx 6
apps/desktop/src/screens/ReportsScreen.tsx     7
apps/desktop/src/screens/SettingsScreen.tsx    8
apps/desktop/src/types/api.d.ts                tipos del contrato IPC
```

### Dashboard
```
apps/dashboard/src/app/layout.tsx              layout Next
apps/dashboard/src/app/page.tsx                9  (Login)
apps/dashboard/src/app/dashboard/page.tsx      10 (Dueño)
apps/dashboard/src/app/admin/page.tsx          11 (Super admin)
apps/dashboard/src/app/admin/new/page.tsx      12 (Crear local)
apps/dashboard/src/app/components/LogoutButton.tsx
apps/dashboard/src/app/admin/ToggleStoreButton.tsx
apps/dashboard/src/lib/supabase*.ts            clientes (server/browser/admin/ssr)
apps/dashboard/middleware.ts                   gate de auth + routing por rol
```

---

## Cómo correr local (referencia)

```bash
# Dashboard (http://localhost:3001 — el 3000 estaba ocupado por Docker)
cd apps/dashboard && npx next dev --port 3001

# Desktop (Vite en 5173 + ventana Electron)
cd apps/desktop && npm run dev
```

`.env.local` en `apps/dashboard/` ya está creado con las credenciales de Supabase + `SUPER_ADMIN_EMAIL=paco.semino@gmail.com`.

Login desktop default: `Administrador` / `1234`.
