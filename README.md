# KioscoApp — Sistema de gestión para kioscos y despensas

Sistema POS (punto de venta) para kioscos y negocios de barrio. Funciona 100% offline, con base de datos local. Sincroniza en segundo plano con Supabase para que el dueño del local pueda ver métricas desde cualquier celular a través del **dashboard web**.

Incluye: ventas, stock, caja, compras, proveedores, reportes, multi-usuario, multi-local (un dueño, varios negocios) y panel de super admin.

---

## Índice

1. [Arquitectura del proyecto](#1-arquitectura-del-proyecto)
2. [Instalación en PC nueva (para desarrolladores)](#2-instalación-en-pc-nueva-para-desarrolladores)
3. [Setup de Supabase](#3-setup-de-supabase)
4. [Dashboard web — setup y deploy](#4-dashboard-web--setup-y-deploy)
5. [Generar el instalador del Desktop](#5-generar-el-instalador-del-desktop)
6. [Manual de usuario — Desktop (POS del local)](#6-manual-de-usuario--desktop-pos-del-local)
7. [Manual de usuario — Dashboard web (dueño)](#7-manual-de-usuario--dashboard-web-dueño)
8. [Manual de usuario — Super admin (crear locales)](#8-manual-de-usuario--super-admin-crear-locales)
9. [Referencia rápida de comandos](#9-referencia-rápida-de-comandos)
10. [Troubleshooting](#10-troubleshooting)
11. [Soporte](#11-soporte)

---

## 1. Arquitectura del proyecto

Monorepo con **dos aplicaciones** que comparten la base de datos Supabase:

```
Gestor-de-negocios/
├── apps/
│   ├── desktop/       ← Electron + React + SQLite (app del local, offline-first)
│   └── dashboard/     ← Next.js 15 (SSR) — web del dueño y super admin
├── packages/          ← configs compartidas (eslint, tsconfig, ui)
├── supabase/
│   ├── schema.sql     ← tablas base (stores, sales, products…)
│   └── schema_v2.sql  ← migración multi-tenant (store_users, roles)
├── turbo.json         ← orquestador de tasks (dev, build, lint)
└── package.json       ← workspaces (npm)
```

### Cómo se conectan las dos apps

```
┌────────────────────┐       ┌────────────────────┐
│  DESKTOP (local)   │       │   DASHBOARD (web)  │
│  Electron + React  │       │   Next.js (SSR)    │
│  SQLite local      │       │                    │
│  100% offline      │       │  Dueño / Admin     │
└─────────┬──────────┘       └──────────┬─────────┘
          │                             │
          │  sync.js (fire-and-forget)  │  lee en vivo
          │  ─────────────────►         │  ◄─────────
          │                             │
          └────────► SUPABASE ◄─────────┘
                   (postgres + auth)
```

- **El desktop nunca depende de internet.** Guarda todo en `kiosco.db` (SQLite local). Cada venta, producto y compra se intenta replicar a Supabase en segundo plano con `sync.js` — si no hay red, se ignora y la app sigue funcionando.
- **El dashboard web** lee directo de Supabase con SSR (Next.js). El dueño abre la URL en el celular, se loguea con email+contraseña, y ve las métricas de su local en tiempo casi real.
- **El super admin** es un email puntual (configurado en env vars) que puede crear nuevos locales desde la web. Cada local creado genera: un registro en `stores`, un usuario en `auth.users`, y el vínculo en `store_users`.

### Stack por app

| App | Framework | UI | Base de datos | Auth |
|---|---|---|---|---|
| Desktop | Electron 41 + React 19 + Vite 8 | Design tokens (`ui/theme.ts`) + GSAP — tema **dark** | SQLite (`better-sqlite3`) + sync a Supabase | usuario/contraseña local (tabla `users` en SQLite) |
| Dashboard | Next.js 15 (App Router, SSR) | Design tokens (`app/tokens.css`) — tema **light** (login dark) | Supabase (postgres) | Supabase Auth (email + contraseña) |

### Design system

Las dos apps comparten un design system unificado generado con **Claude Design** (bundle: `kioscoapp-design-system/`). La fuente de verdad son los design tokens — colores, tipografía, spacing, radios, shadows, gradientes — materializados de dos formas equivalentes:

- **Desktop:** `apps/desktop/src/ui/theme.ts` exporta los tokens como constantes tipadas (`color`, `radius`, `shadow`, `pad`, `easing`) que los screens consumen en estilos inline. Tema **dark** (`#0f1117` canvas, `#1a1d27` surface, `#6366f1` brand indigo).
- **Dashboard:** `apps/dashboard/src/app/tokens.css` expone los mismos tokens como CSS variables (`var(--brand-500)`, `var(--surface)`, …). Tema **light** por default; el login usa un gradient radial dark + glass card (única concesión "fancy" del producto — marca el momento pre-app).

**Reglas fundacionales** (ver `SKILL.md` del bundle para la versión completa):
1. El dinero es lo más grande en pantalla. `tabular-nums`, coma decimal, `$1.480`.
2. Un solo color primario por pantalla — indigo para decisiones, sky para momentos transitorios (login), verde/ámbar/rojo solo para status.
3. Dark en el POS, light en el dashboard. Nunca se mezclan.
4. Voseo argentino, imperativos cortos: *Cobrar*, *Abrir caja*, *Escaneá o buscá un producto*.
5. Nada de emojis en producción — iconos `lucide-react` en desktop, SVGs inline lucide-style en dashboard.

Si agregás una pantalla nueva, **empezá siempre desde los tokens** y extendé `04-components.html` del bundle si necesitás un patrón nuevo. Nunca hardcodees un color hex ni inventes una nueva familia de colores.

---

## 2. Instalación en PC nueva (para desarrolladores)

Seguí estos pasos en orden si querés correr el proyecto desde el código fuente.

### Paso 1 — Instalar Node.js

1. Entrá a [https://nodejs.org](https://nodejs.org)
2. Descargá la versión **LTS** (la que dice "Recomendado para la mayoría")
3. Ejecutá el instalador y seguí los pasos (todo por defecto)
4. Para verificar, abrí una terminal y escribí:
   ```
   node --version
   ```
   Tiene que aparecer algo como `v22.x.x` o superior.

### Paso 2 — Instalar las herramientas de compilación (solo Windows)

`better-sqlite3` es una librería nativa que necesita compilarse. En Windows hay que tener instaladas las herramientas de build de C++.

1. Abrí una terminal **como Administrador**
2. Ejecutá:
   ```
   npm install --global windows-build-tools
   ```
   Esto instala Python y Visual Studio Build Tools automáticamente. Puede tardar varios minutos.

> En Mac esto no es necesario, viene incluido con Xcode Command Line Tools.

### Paso 3 — Clonar el repositorio

```bash
git clone https://github.com/juancanterle/Gestor-de-negocios.git kiosco-app
cd kiosco-app
```

Si no tenés Git instalado, descargalo desde [https://git-scm.com](https://git-scm.com).

### Paso 4 — Instalar dependencias

```bash
npm install
```

Esto descarga todas las librerías de las dos apps (el monorepo usa npm workspaces). Puede tardar unos minutos la primera vez.

### Paso 5 — Recompilar better-sqlite3 para Electron

`better-sqlite3` necesita compilarse específicamente para la versión de Electron del proyecto. Desde la carpeta raíz:

```bash
cd apps/desktop
HOME=~/.electron-gyp node_modules/.bin/node-gyp rebuild \
  --target=$(cat ../../node_modules/electron/dist/version) \
  --dist-url=https://electronjs.org/headers \
  --directory=../../node_modules/better-sqlite3
cd ../..
```

> En Windows, reemplazá `HOME=~/.electron-gyp` por `set USERPROFILE=%USERPROFILE%\.electron-gyp &&` al principio.

### Paso 6 — Configurar las variables de entorno

El **dashboard** necesita credenciales de Supabase. Creá `apps/dashboard/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
SUPER_ADMIN_EMAIL=tu-email@dominio.com
```

Cómo conseguir estos valores → [sección 3. Setup de Supabase](#3-setup-de-supabase).

> El desktop también tiene un cliente de Supabase hardcodeado en `apps/desktop/electron/sync.js` (URL + anon key). Si usás **otro proyecto de Supabase**, editá esas constantes.

### Paso 7 — Correr las apps en modo desarrollo

Podés correr las dos al mismo tiempo desde la raíz:

```bash
npm run dev
```

Turborepo levanta ambas en paralelo:

- **Desktop:** abre la ventana de Electron (Vite en `localhost:5173`).
- **Dashboard:** queda disponible en `http://localhost:3000`.

O una por vez:

```bash
# Solo desktop
cd apps/desktop && npm run dev

# Solo dashboard
cd apps/dashboard && npm run dev
```

> Si el puerto `3000` está ocupado (por ejemplo por Docker), forzá otro: `npx next dev --port 3001`.

---

## 3. Setup de Supabase

Esta sección es solo para el primer setup del proyecto — si ya tenés el `.env.local` funcional, saltala.

### Paso 1 — Crear el proyecto

1. Entrá a [https://supabase.com](https://supabase.com) y creá una cuenta.
2. **New project** → ponele nombre (ej: `kioscoapp-prod`), elegí región (la más cercana: São Paulo) y una contraseña de base de datos.
3. Esperá ~2 minutos a que se aprovisione.

### Paso 2 — Correr los schemas SQL

En el panel de Supabase: **SQL Editor → New query**.

1. Pegá el contenido de `supabase/schema.sql` y ejecutá (crea `stores`, `products`, `sales`, `sale_items`, etc.).
2. Pegá el contenido de `supabase/schema_v2.sql` y ejecutá (agrega `store_users` para el multi-tenant).

### Paso 3 — Obtener las credenciales

En el panel: **Project Settings → API**.

| Campo | Dónde se usa |
|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` (dashboard) + constante en `apps/desktop/electron/sync.js` |
| **anon public** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` (dashboard) + constante en `apps/desktop/electron/sync.js` |
| **service_role** | `SUPABASE_SERVICE_ROLE_KEY` — **solo backend**, nunca la expongas al cliente |

### Paso 4 — Designar al super admin

Poné tu propio email en `SUPER_ADMIN_EMAIL` del `.env.local`. Ese email, cuando se loguea, va a ver el panel de administración (`/admin`) en vez del dashboard normal.

**Importante:** el super admin también necesita existir como usuario en Supabase Auth. Creá uno desde el panel **Authentication → Users → Add user** con el mismo email.

---

## 4. Dashboard web — setup y deploy

### Correrlo local

```bash
cd apps/dashboard
npm run dev
```

Abre en `http://localhost:3000`. Hace falta tener `.env.local` configurado (ver [Paso 6 de instalación](#paso-6--configurar-las-variables-de-entorno)).

### Deployar en Vercel (recomendado)

1. Subí el repo a GitHub (ya está).
2. Entrá a [https://vercel.com](https://vercel.com) → **New Project** → importá el repo.
3. **Root Directory:** `apps/dashboard`
4. **Framework:** Next.js (lo detecta automático).
5. En **Environment Variables**, cargá las mismas 4 variables del `.env.local`.
6. Deploy. Queda en `tu-proyecto.vercel.app`.

La URL final es la que compartís con los dueños de los locales.

### Rutas principales del dashboard

| Ruta | Quién accede | Qué ve |
|---|---|---|
| `/` | cualquiera | login (redirige según rol) |
| `/dashboard` | dueño del local | KPIs, caja, últimas ventas, stock bajo |
| `/admin` | super admin | lista de locales, activar/desactivar |
| `/admin/new` | super admin | formulario para crear un local nuevo |

El middleware (`apps/dashboard/middleware.ts`) hace el gate de auth y el routing por rol.

---

## 5. Generar el instalador del Desktop

Cuando la app esté lista para entregar a un negocio, generás un instalador ejecutable.

```bash
cd apps/desktop
npm run build
npm run build:electron
```

El instalador queda en:
```
apps/desktop/dist-electron/KioscoApp Setup X.X.X.exe   ← Windows
apps/desktop/dist-electron/KioscoApp-X.X.X.dmg         ← Mac
```

### Cómo instalarlo en la PC del local

1. Copiá el archivo `.exe` (o `.dmg`) a la PC del negocio (USB, WhatsApp, Drive, etc.).
2. Hacé doble click en el instalador.
3. Seguí los pasos (todo por defecto).
4. La app queda en el menú inicio y en el escritorio.

### Dónde se guarda la base de datos local

La información del negocio (productos, ventas, caja, etc.) se guarda en:

- **Windows:** `C:\Users\[usuario]\AppData\Roaming\KioscoApp\kiosco.db`
- **Mac:** `~/Library/Application Support/KioscoApp/kiosco.db`

Es un archivo SQLite. Si querés hacer un backup, copiá ese archivo.

### Cómo se replica a Supabase

El archivo `apps/desktop/electron/sync.js` intercepta cada venta, producto y compra creados en SQLite y los replica a Supabase con un `upsert` (fire-and-forget). Si falla (sin internet, timeout), lo ignora silenciosamente — la venta local ya quedó guardada.

**Consecuencia:** si un local está mucho tiempo sin internet, sus datos en el dashboard web se van desfasando. Al reconectar, las ventas **nuevas** empiezan a sincronizar, pero las históricas offline quedan solo en el `.db` local.

---

## 6. Manual de usuario — Desktop (POS del local)

### Primer inicio

Al abrir la app por primera vez:

| Campo | Valor por defecto |
|---|---|
| Usuario | `Administrador` |
| Contraseña | `1234` |

> Cambiá la contraseña desde **Configuración → Usuarios** lo antes posible.

### Flujo diario recomendado

```
1. Abrir la app → ingresar con usuario y contraseña
2. Abrir la caja (ingresar el monto inicial en efectivo)
3. Hacer las ventas del día
4. Al cierre: cerrar la caja ingresando el efectivo real contado
```

### Pantalla de Venta (POS)

La pantalla principal para cobrar a los clientes.

**Cómo hacer una venta:**
1. Escaneá el código de barras del producto con el lector — se agrega al carrito automáticamente.
2. Si no tenés lector, buscás el producto escribiendo el nombre o código en el campo de búsqueda.
3. Podés cambiar la cantidad haciendo click en los botones `+` y `−` del carrito.
4. Para quitar un producto, hacés click en el ícono de basura.
5. Cuando el carrito está listo, hacés click en **Cobrar**.
6. Seleccionás el método de pago: **Efectivo** o **Transferencia**.
7. Si es en efectivo, ingresás el monto que te da el cliente y la app calcula el vuelto.
8. Confirmás y la venta queda registrada.

> La pantalla de venta solo funciona si hay una caja abierta. Si no hay caja, la app te redirige a abrirla automáticamente.

### Pantalla de Caja

Gestiona el efectivo del negocio.

**Abrir la caja:**
1. Ingresá el monto de efectivo con el que empezás el día (el "fondo").
2. Hacés click en **Abrir caja**.

**Ver el estado actual:**
- Total teórico (apertura + ventas en efectivo + ingresos − egresos).
- Historial de movimientos del día.

**Registrar un movimiento manual:**
- **Ingreso manual:** por ejemplo, cuando ponés más billetes en la caja.
- **Egreso manual:** por ejemplo, cuando retirás plata para un gasto.

**Cerrar la caja:**
1. Contás el efectivo real que hay en la caja.
2. Ingresás ese monto en el campo de cierre.
3. La app te muestra la diferencia entre lo teórico y lo real.
4. Confirmás el cierre.

### Pantalla de Productos

**Crear un producto nuevo:**
1. Hacés click en **Nuevo producto**.
2. El cursor queda en el campo **Código de barras** — escaneás el producto con el lector.
3. El código se llena automáticamente y el cursor salta al campo **Nombre**.
4. Completás: nombre, categoría, proveedor, costo, markup y stock.
5. El **precio de venta** se calcula automáticamente: `costo × (1 + markup%)`.
6. Si querés un precio fijo en lugar del calculado, tildás **Usar precio manual**.
7. Guardás.

**Filtros:** buscar por nombre o código de barras · filtrar por categoría · filtrar por proveedor.

**Columnas de la tabla:**
- **Costo:** precio al que comprás.
- **Markup:** porcentaje de ganancia.
- **Precio:** precio de venta al público.
- **Stock:** cantidad disponible (se marca en naranja si está por debajo del mínimo).

### Pantalla de Compras

Registra el ingreso de mercadería y actualiza el stock automáticamente.

**Registrar una compra:**
1. Hacés click en **Nueva compra**.
2. (Opcional) Seleccionás el proveedor.
3. (Opcional) Agregás una nota (ej: "factura 0001-00012345").
4. Buscás los productos que compraste.
5. Para cada producto, modificás la **cantidad** y el **costo unitario** de esa compra.
6. Confirmás el ingreso.

Al confirmar: el stock sube automáticamente y el costo del producto se actualiza al precio de la última compra.

### Pantalla de Proveedores

**Datos que podés guardar:** nombre del proveedor · nombre del contacto · teléfono · notas.

**Panel de detalle:** al hacer click en un proveedor, se abre un panel lateral con ventas del día de sus productos y productos con stock bajo.

### Pantalla de Reportes

**Períodos disponibles:** Hoy / Últimos 7 días / Últimos 30 días.

**Pestañas:**
- **Evolución:** gráfico de barras con ventas por día.
- **Productos:** top 10 productos más vendidos (unidades, total vendido y margen).
- **Proveedores:** ventas agrupadas por proveedor con porcentaje del total.
- **Stock bajo:** lista de productos que llegaron o superaron el mínimo de stock.

**KPIs:** total de ventas (monto y cantidad de tickets) · total en efectivo · total en transferencias · ticket promedio.

### Pantalla de Configuración

**Pestaña "Configuración del local":**
- Nombre del negocio, dirección, teléfono.
- Encabezado y pie del ticket de caja.
- Redondeo de precios calculados (sin redondeo / a $10 / a $50 / a $100).

**Pestaña "Usuarios":**
- Lista de usuarios con acceso al sistema.
- Crear nuevos usuarios con nombre, contraseña y rol.
- Roles:
  - **Dueño:** acceso completo.
  - **Encargado:** acceso completo excepto configuración avanzada.
  - **Cajero:** solo puede hacer ventas.

### Lector de código de barras

El programa es compatible con cualquier lector de código de barras que funcione como teclado (modo HID) — estándar de lectores USB y Bluetooth comunes.

- **En la pantalla de Venta:** apuntás al código del producto y escaneás.
- **En la pantalla de Productos:** al crear un nuevo producto, el campo de código ya está listo para recibir el escaneo.

No hace falta configuración especial — enchufás el lector y funciona.

---

## 7. Manual de usuario — Dashboard web (dueño)

El dueño del local entra desde cualquier celular o computadora a la URL del dashboard (ej: `kioscoapp.vercel.app`) y ve métricas en vivo de su negocio.

### Login

1. Abrí la URL en el navegador.
2. Ingresá el email y contraseña que te dio el super admin cuando creó tu local.
3. La app te redirige automáticamente a tu panel.

### Qué vas a ver en `/dashboard`

- **Nombre del negocio + fecha del día.**
- **KPIs de hoy:** ventas totales, efectivo, transferencias, ticket promedio.
- **Estado de la caja:** si está abierta (dot verde + hora de apertura + monto teórico) o cerrada.
- **Últimas 6 ventas:** número de ticket, hora, método de pago y monto.
- **Stock bajo:** productos con stock por debajo del mínimo (si los hay).

La info se actualiza cada vez que recargás la página — es SSR, no hay polling automático (bajo consumo de datos en el celular).

---

## 8. Manual de usuario — Super admin (crear locales)

El super admin es la persona que administra la plataforma y da de alta a los nuevos locales.

### Crear un nuevo local

1. Entrá a la URL del dashboard con el email configurado como `SUPER_ADMIN_EMAIL`.
2. Te redirige a `/admin`.
3. Hacés click en **+ Nuevo local**.
4. Completás:
   - **Nombre del local** (ej: "Kiosco El Pibe").
   - **Email del dueño** (el que va a usar para entrar al dashboard).
   - **Contraseña** (elegila vos — el dueño puede cambiarla después desde Supabase si hace falta).
5. **Crear local.**

Al crear, el sistema:
- Inserta un registro en `stores` (Supabase).
- Crea un usuario en `auth.users` con ese email y contraseña.
- Vincula ambos en `store_users` con rol `owner`.

Después del éxito, se muestra un resumen con el **Store ID** del local (útil si querés debuggear desde SQL).

> **Importante:** la contraseña no se puede recuperar desde el dashboard. Anotala antes de cerrar la pantalla.

### Activar / desactivar un local

En `/admin`, cada local tiene un botón toggle. Al desactivar:
- El registro queda en `stores` con `active = false`.
- El dueño sigue pudiendo loguear, pero si quisiéramos bloquearlo habría que extender el middleware para chequear `active` (TODO si hace falta).

---

## 9. Referencia rápida de comandos

Todos desde la raíz del repo, salvo que diga otra cosa.

| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias de ambas apps |
| `npm run dev` | Levanta **ambas** apps en paralelo (desktop + dashboard) |
| `npm run build` | Builds de producción de ambas apps |
| `npm run lint` | Corre ESLint en ambas apps |
| `npm run format` | Corre Prettier sobre todo el repo |
| `npm run check-types` | Chequeo de TypeScript en ambas apps |
| `cd apps/desktop && npm run dev` | Solo desktop (Electron + Vite) |
| `cd apps/desktop && npm run build:electron` | Genera instalador (`.exe` / `.dmg`) |
| `cd apps/dashboard && npm run dev` | Solo dashboard |

---

## 10. Troubleshooting

### "Cannot find module 'better-sqlite3'" al abrir el desktop

Tenés que recompilarla para la versión de Electron. Repetí el [Paso 5 de instalación](#paso-5--recompilar-better-sqlite3-para-electron).

### El puerto 3000 está ocupado (Docker, otra app)

```bash
cd apps/dashboard
npx next dev --port 3001
```

Y ajustá el `SUPABASE_URL` de redirect si hace falta (por default Supabase acepta localhost en cualquier puerto).

### El dashboard muestra "Unauthorized" o redirect infinito

1. Verificá que `SUPER_ADMIN_EMAIL` del `.env.local` coincida **exactamente** con el email del usuario super admin en Supabase Auth.
2. Verificá que el usuario exista en `auth.users` (panel Supabase → Authentication → Users).
3. Si sos dueño de un local, verificá que exista un registro en `store_users` con tu `user.id`.

### Las ventas del desktop no aparecen en el dashboard

- Chequeá que la PC del local tenga internet (el sync es fire-and-forget; si falla se pierde).
- Chequeá `apps/desktop/electron/sync.js` — la URL y anon key deben apuntar al mismo proyecto que el dashboard.
- Abrí la DevTools del Electron (se abre automática en dev) y buscá warnings `[sync] sale:` / `[sync] product:` que indican fallos de sync.

### Quiero resetear la base de datos local del desktop

Cerrá la app y borrá el archivo:
- Windows: `C:\Users\[usuario]\AppData\Roaming\KioscoApp\kiosco.db`
- Mac: `~/Library/Application Support/KioscoApp/kiosco.db`

Al volver a abrir, se recrean las tablas y el usuario por defecto (`Administrador` / `1234`).

### Olvidé la contraseña del dueño de un local

Desde el panel de Supabase → **Authentication → Users** → buscar el email → ⋯ → **Send password recovery** (o resetear manualmente).

### La rebuild de better-sqlite3 falla en Mac (`gyp ERR!`)

Asegurate de tener las Xcode Command Line Tools:
```bash
xcode-select --install
```

### El instalador `.dmg` no abre en Mac ("app dañada")

Mac bloquea apps sin firmar. Para abrir una vez:
```bash
xattr -d com.apple.quarantine /Applications/KioscoApp.app
```

Para distribución real al cliente, habría que firmar la app con un certificado de Apple Developer (Apple Developer Program, ~99 USD/año).

---

## 11. Soporte

Para reportar problemas o sugerir mejoras, abrí un issue en:
[https://github.com/juancanterle/Gestor-de-negocios/issues](https://github.com/juancanterle/Gestor-de-negocios/issues)
