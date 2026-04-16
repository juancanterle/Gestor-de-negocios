# KioscoApp — Sistema de gestión para kioscos y despensas

Sistema POS (punto de venta) para kioscos y negocios de barrio. Funciona 100% offline, con base de datos local. Incluye ventas, stock, caja, compras, proveedores y reportes.

---

## Índice

1. [Instalación en PC nueva (para desarrolladores)](#1-instalación-en-pc-nueva-para-desarrolladores)
2. [Cómo generar el instalador para entregar a un local](#2-cómo-generar-el-instalador-para-entregar-a-un-local)
3. [Manual de usuario](#3-manual-de-usuario)

---

## 1. Instalación en PC nueva (para desarrolladores)

Seguí estos pasos en orden si querés correr el proyecto desde el código fuente.

### Paso 1 — Instalar Node.js

1. Entrá a [https://nodejs.org](https://nodejs.org)
2. Descargá la versión **LTS** (la que dice "Recomendado para la mayoría")
3. Ejecutá el instalador y seguí los pasos (todo por defecto)
4. Para verificar que quedó bien, abrí una terminal y escribí:
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

Esto descarga todas las librerías del proyecto. Puede tardar unos minutos la primera vez.

### Paso 5 — Recompilar better-sqlite3 para Electron

`better-sqlite3` necesita compilarse específicamente para la versión de Electron del proyecto. Ejecutá esto desde la carpeta `apps/desktop`:

```bash
cd apps/desktop
```

Luego, desde esa carpeta:

```bash
HOME=~/.electron-gyp node_modules/.bin/node-gyp rebuild \
  --target=$(cat ../../node_modules/electron/dist/version) \
  --dist-url=https://electronjs.org/headers \
  --directory=../../node_modules/better-sqlite3
```

> En Windows, reemplazá `HOME=~/.electron-gyp` por `set USERPROFILE=%USERPROFILE%\.electron-gyp &&` al principio.

### Paso 6 — Correr la aplicación en modo desarrollo

```bash
npm run dev
```

Esto abre la ventana de la aplicación. Cualquier cambio en el código se refleja en tiempo real.

---

## 2. Cómo generar el instalador para entregar a un local

Cuando la app esté lista para entregar a un negocio, generás un instalador ejecutable.

### Desde la carpeta `apps/desktop`:

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

1. Copiá el archivo `.exe` a la PC del negocio (USB, WhatsApp, Drive, etc.)
2. Hacé doble click en el instalador
3. Seguí los pasos (todo por defecto)
4. La app queda en el menú inicio y en el escritorio

### Dónde se guarda la base de datos

La información del negocio (productos, ventas, caja, etc.) se guarda localmente en:

- **Windows:** `C:\Users\[usuario]\AppData\Roaming\KioscoApp\kiosco.db`
- **Mac:** `~/Library/Application Support/KioscoApp/kiosco.db`

Es un archivo SQLite. Si querés hacer un backup, simplemente copiá ese archivo.

---

## 3. Manual de usuario

### Primer inicio

Al abrir la app por primera vez:

| Campo | Valor por defecto |
|-------|-------------------|
| Usuario | `Administrador` |
| Contraseña | `1234` |

> Cambiá la contraseña desde **Configuración → Usuarios** lo antes posible.

---

### Flujo diario recomendado

```
1. Abrir la app → ingresar con usuario y contraseña
2. Abrir la caja (ingresar el monto inicial en efectivo)
3. Hacer las ventas del día
4. Al cierre: cerrar la caja ingresando el efectivo real contado
```

---

### Pantalla de Venta (POS)

La pantalla principal para cobrar a los clientes.

**Cómo hacer una venta:**

1. Escaneá el código de barras del producto con el lector — se agrega al carrito automáticamente
2. Si no tenés lector, buscás el producto escribiendo el nombre o código en el campo de búsqueda
3. Podés cambiar la cantidad haciendo click en los botones `+` y `−` del carrito
4. Para quitar un producto, hacés click en el ícono de basura
5. Cuando el carrito está listo, hacés click en **Cobrar**
6. Seleccionás el método de pago: **Efectivo** o **Transferencia**
7. Si es en efectivo, ingresás el monto que te da el cliente y la app calcula el vuelto
8. Confirmás y la venta queda registrada

> La pantalla de venta solo funciona si hay una caja abierta. Si no hay caja, la app te redirige a abrirla automáticamente.

---

### Pantalla de Caja

Gestiona el efectivo del negocio.

**Abrir la caja:**
1. Ingresá el monto de efectivo con el que empezás el día (el "fondo")
2. Hacés click en **Abrir caja**

**Ver el estado actual:**
- Ves el total teórico (apertura + ventas en efectivo + ingresos − egresos)
- Ves el historial de movimientos del día

**Registrar un movimiento manual:**
- **Ingreso manual:** por ejemplo, cuando ponés más billetes en la caja
- **Egreso manual:** por ejemplo, cuando retirás plata para un gasto

**Cerrar la caja:**
1. Contás el efectivo real que hay en la caja
2. Ingresás ese monto en el campo de cierre
3. La app te muestra la diferencia entre lo teórico y lo real
4. Confirmás el cierre

---

### Pantalla de Productos

Alta, baja y modificación del catálogo de productos.

**Crear un producto nuevo:**
1. Hacés click en **Nuevo producto**
2. El cursor queda en el campo **Código de barras** — escaneás el producto con el lector
3. El código se llena automáticamente y el cursor salta al campo **Nombre**
4. Completás: nombre, categoría, proveedor, costo, markup y stock
5. El **precio de venta** se calcula automáticamente: `costo × (1 + markup%)`
6. Si querés un precio fijo en lugar del calculado, tildás **Usar precio manual**
7. Guardás

**Filtros disponibles:**
- Buscar por nombre o código de barras
- Filtrar por categoría
- Filtrar por proveedor

**Columnas de la tabla:**
- **Costo:** precio al que comprás el producto
- **Markup:** porcentaje de ganancia
- **Precio:** precio de venta al público
- **Stock:** cantidad disponible (se marca en naranja si está por debajo del mínimo)

---

### Pantalla de Compras

Registra el ingreso de mercadería y actualiza el stock automáticamente.

**Registrar una compra:**
1. Hacés click en **Nueva compra**
2. (Opcional) Seleccionás el proveedor
3. (Opcional) Agregás una nota (ej: "factura 0001-00012345")
4. Buscás los productos que compraste usando el buscador
5. Para cada producto, modificás la **cantidad** y el **costo unitario** de esa compra
6. Confirmás el ingreso

Al confirmar:
- El stock de cada producto sube automáticamente
- El costo del producto se actualiza al precio de la última compra

---

### Pantalla de Proveedores

Administración de los proveedores del negocio.

**Datos que podés guardar:**
- Nombre del proveedor (ej: Arcor, Mastellone)
- Nombre del contacto (el vendedor)
- Teléfono
- Notas (ej: "visita los martes", "pago a 30 días")

**Panel de detalle:**
Al hacer click en un proveedor, se abre un panel lateral con:
- Ventas del día de productos de ese proveedor
- Productos de ese proveedor con stock bajo

---

### Pantalla de Reportes

Análisis de las ventas del negocio.

**Períodos disponibles:** Hoy / Últimos 7 días / Últimos 30 días

**Pestañas:**

- **Evolución:** gráfico de barras con ventas por día
- **Productos:** top 10 productos más vendidos (unidades, total vendido y margen)
- **Proveedores:** ventas agrupadas por proveedor con porcentaje del total
- **Stock bajo:** lista de productos que llegaron o superaron el mínimo de stock

**KPIs principales:**
- Total de ventas (monto y cantidad de tickets)
- Total en efectivo
- Total en transferencias
- Ticket promedio

---

### Pantalla de Configuración

**Pestaña "Configuración del local":**
- Nombre del negocio
- Dirección y teléfono
- Encabezado y pie del ticket de caja
- Redondeo de precios calculados (sin redondeo / a $10 / a $50 / a $100)

**Pestaña "Usuarios":**
- Lista de usuarios con acceso al sistema
- Crear nuevos usuarios con nombre, contraseña y rol
- Roles disponibles:
  - **Dueño:** acceso completo
  - **Encargado:** acceso completo excepto configuración avanzada
  - **Cajero:** solo puede hacer ventas

---

### Lector de código de barras

El programa es compatible con cualquier lector de código de barras que funcione como teclado (modo HID), que es el estándar de los lectores USB y Bluetooth comunes.

**En la pantalla de Venta:** apuntás al código del producto y escaneás — se agrega al carrito automáticamente.

**En la pantalla de Productos:** al crear un nuevo producto, el campo de código ya está listo para recibir el escaneo.

No hace falta ninguna configuración especial — enchufás el lector y ya funciona.

---

## Soporte

Para reportar problemas o sugerir mejoras, abrí un issue en:
[https://github.com/juancanterle/Gestor-de-negocios/issues](https://github.com/juancanterle/Gestor-de-negocios/issues)
