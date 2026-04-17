const Database = require('better-sqlite3')
const { app, ipcMain } = require('electron')
const path = require('path')
const { randomUUID } = require('crypto')
const { setDb, syncSale, syncProduct, syncCashRegister, syncCashMovement } = require('./sync')

let db

function initDatabase() {
  const dbPath = app.isPackaged
    ? path.join(app.getPath('userData'), 'kiosco.db')
    : path.join(app.getPath('userData'), 'kiosco-dev.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations()
  setDb(db)
  registerHandlers()

  console.log('Base de datos iniciada en:', dbPath)
}

function closeDatabase() {
  if (db) db.close()
}

// ─────────────────────────────────────────
// MIGRACIONES
// ─────────────────────────────────────────

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT NOT NULL UNIQUE,
      run_at    TEXT NOT NULL
    );
  `)

  const migrations = [
    { name: '001_initial_schema', sql: migration001 },
    { name: '002_supabase_store_id', sql: migration002 },
  ]

  const ran = db.prepare('SELECT name FROM migrations').all().map(r => r.name)

  for (const m of migrations) {
    if (!ran.includes(m.name)) {
      try {
        db.exec(m.sql)
      } catch (e) {
        // ALTER TABLE falla si la columna ya existe (DB antigua) — ignoramos
        console.warn('Migración con advertencia:', m.name, e.message)
      }
      db.prepare('INSERT INTO migrations (name, run_at) VALUES (?, ?)').run(m.name, new Date().toISOString())
      console.log('Migración ejecutada:', m.name)
    }
  }
}

const migration001 = `
  CREATE TABLE IF NOT EXISTS store (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL DEFAULT 'Mi Kiosco',
    address      TEXT,
    phone        TEXT,
    ticket_header TEXT DEFAULT '',
    ticket_footer TEXT DEFAULT 'Gracias por su compra',
    currency     TEXT DEFAULT 'ARS',
    price_round_mode TEXT DEFAULT 'NONE',
    created_at   TEXT NOT NULL
  );

  INSERT OR IGNORE INTO store (id, name, created_at)
  VALUES ('default', 'Mi Kiosco', datetime('now'));

  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    store_id   TEXT NOT NULL DEFAULT 'default',
    name       TEXT NOT NULL,
    pin        TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'CASHIER',
    active     INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  INSERT OR IGNORE INTO users (id, store_id, name, pin, role, created_at)
  VALUES ('admin', 'default', 'Administrador', '1234', 'OWNER', datetime('now'));

  CREATE TABLE IF NOT EXISTS categories (
    id         TEXT PRIMARY KEY,
    store_id   TEXT NOT NULL DEFAULT 'default',
    name       TEXT NOT NULL,
    color      TEXT DEFAULT '#6366f1',
    active     INTEGER DEFAULT 1,
    synced     INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id         TEXT PRIMARY KEY,
    store_id   TEXT NOT NULL DEFAULT 'default',
    name       TEXT NOT NULL,
    contact    TEXT,
    phone      TEXT,
    notes      TEXT,
    active     INTEGER DEFAULT 1,
    synced     INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id            TEXT PRIMARY KEY,
    global_id     TEXT UNIQUE,
    store_id      TEXT NOT NULL DEFAULT 'default',
    barcode       TEXT,
    name          TEXT NOT NULL,
    description   TEXT,
    category_id   TEXT REFERENCES categories(id),
    supplier_id   TEXT REFERENCES suppliers(id),
    cost          REAL NOT NULL DEFAULT 0,
    markup        REAL NOT NULL DEFAULT 0,
    price_auto    REAL DEFAULT 0,
    price_manual  REAL,
    use_manual    INTEGER DEFAULT 0,
    round_mode    TEXT DEFAULT 'INHERIT',
    stock         REAL DEFAULT 0,
    stock_min     REAL DEFAULT 0,
    unit          TEXT DEFAULT 'un',
    active        INTEGER DEFAULT 1,
    synced        INTEGER DEFAULT 0,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    deleted_at    TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_products_barcode  ON products(barcode);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
  CREATE INDEX IF NOT EXISTS idx_products_active   ON products(active, deleted_at);

  CREATE TABLE IF NOT EXISTS price_history (
    id         TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id),
    cost       REAL NOT NULL,
    markup     REAL NOT NULL,
    price      REAL NOT NULL,
    changed_by TEXT NOT NULL,
    synced     INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id          TEXT PRIMARY KEY,
    global_id   TEXT UNIQUE,
    store_id    TEXT NOT NULL DEFAULT 'default',
    supplier_id TEXT REFERENCES suppliers(id),
    user_id     TEXT NOT NULL,
    total_cost  REAL NOT NULL DEFAULT 0,
    notes       TEXT,
    status      TEXT DEFAULT 'CONFIRMED',
    synced      INTEGER DEFAULT 0,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchase_items (
    id          TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL REFERENCES purchases(id),
    product_id  TEXT NOT NULL REFERENCES products(id),
    quantity    REAL NOT NULL,
    unit_cost   REAL NOT NULL,
    subtotal    REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cash_registers (
    id                 TEXT PRIMARY KEY,
    global_id          TEXT UNIQUE,
    store_id           TEXT NOT NULL DEFAULT 'default',
    user_id            TEXT NOT NULL,
    status             TEXT DEFAULT 'OPEN',
    opening_amount     REAL NOT NULL DEFAULT 0,
    closing_amount     REAL,
    theoretical_amount REAL,
    difference         REAL,
    notes              TEXT,
    synced             INTEGER DEFAULT 0,
    opened_at          TEXT NOT NULL,
    closed_at          TEXT
  );

  CREATE TABLE IF NOT EXISTS cash_movements (
    id               TEXT PRIMARY KEY,
    global_id        TEXT UNIQUE,
    store_id         TEXT NOT NULL DEFAULT 'default',
    cash_register_id TEXT NOT NULL REFERENCES cash_registers(id),
    type             TEXT NOT NULL,
    amount           REAL NOT NULL,
    description      TEXT,
    reference_id     TEXT,
    user_id          TEXT NOT NULL,
    synced           INTEGER DEFAULT 0,
    created_at       TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_cash_mov_register ON cash_movements(cash_register_id);

  CREATE TABLE IF NOT EXISTS sales (
    id               TEXT PRIMARY KEY,
    global_id        TEXT UNIQUE,
    store_id         TEXT NOT NULL DEFAULT 'default',
    ticket_number    INTEGER NOT NULL,
    user_id          TEXT NOT NULL,
    cash_register_id TEXT NOT NULL REFERENCES cash_registers(id),
    subtotal         REAL NOT NULL,
    total            REAL NOT NULL,
    payment_method   TEXT NOT NULL,
    amount_paid      REAL,
    change_given     REAL,
    status           TEXT DEFAULT 'COMPLETED',
    printed          INTEGER DEFAULT 0,
    cancelled_at     TEXT,
    cancelled_by     TEXT,
    cancel_reason    TEXT,
    synced           INTEGER DEFAULT 0,
    created_at       TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sales_created  ON sales(created_at);
  CREATE INDEX IF NOT EXISTS idx_sales_register ON sales(cash_register_id);
  CREATE INDEX IF NOT EXISTS idx_sales_synced   ON sales(synced);

  CREATE TABLE IF NOT EXISTS sale_items (
    id           TEXT PRIMARY KEY,
    sale_id      TEXT NOT NULL REFERENCES sales(id),
    product_id   TEXT NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    barcode      TEXT,
    quantity     REAL NOT NULL,
    unit_price   REAL NOT NULL,
    unit_cost    REAL NOT NULL,
    subtotal     REAL NOT NULL,
    synced       INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_sale_items_sale    ON sale_items(sale_id);
  CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

  CREATE TABLE IF NOT EXISTS stock_movements (
    id           TEXT PRIMARY KEY,
    global_id    TEXT UNIQUE,
    store_id     TEXT NOT NULL DEFAULT 'default',
    product_id   TEXT NOT NULL REFERENCES products(id),
    type         TEXT NOT NULL,
    quantity     REAL NOT NULL,
    stock_before REAL NOT NULL,
    stock_after  REAL NOT NULL,
    reference_id TEXT,
    user_id      TEXT NOT NULL,
    notes        TEXT,
    synced       INTEGER DEFAULT 0,
    created_at   TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
  CREATE INDEX IF NOT EXISTS idx_movements_created ON stock_movements(created_at);

  CREATE TABLE IF NOT EXISTS sync_queue (
    id          TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id   TEXT NOT NULL,
    operation   TEXT NOT NULL,
    payload     TEXT NOT NULL,
    priority    INTEGER DEFAULT 5,
    attempts    INTEGER DEFAULT 0,
    last_error  TEXT,
    status      TEXT DEFAULT 'PENDING',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status, priority, created_at);
`

const migration002 = `
  ALTER TABLE store ADD COLUMN supabase_store_id TEXT;
`

// ─────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────

function getProductById(id) {
  return db.prepare(`
    SELECT p.*, c.name as category_name, s.name as supplier_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.id = ?
  `).get(id)
}

function insertPriceHistory(productId, cost, markup, price, userId, now) {
  db.prepare(`
    INSERT INTO price_history (id, product_id, cost, markup, price, changed_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), productId, cost, markup, price, userId, now)
}

// delta > 0 = entrada, delta < 0 = salida
function applyStockDelta(productId, delta, type, referenceId, userId, now) {
  const product = db.prepare('SELECT stock FROM products WHERE id=?').get(productId)
  const newStock = product.stock + delta
  db.prepare('UPDATE products SET stock=?, updated_at=?, synced=0 WHERE id=?')
    .run(newStock, now, productId)
  db.prepare(`
    INSERT INTO stock_movements (id, product_id, type, quantity, stock_before, stock_after, reference_id, user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), productId, type, delta, product.stock, newStock, referenceId, userId, now)
}

// ─────────────────────────────────────────
// IPC HANDLERS
// ─────────────────────────────────────────

function registerHandlers() {
  // ── STORE ──
  ipcMain.handle('store:get', () => {
    return db.prepare('SELECT * FROM store WHERE id = ?').get('default')
  })

  ipcMain.handle('store:update', (_, data) => {
    db.prepare(`
      UPDATE store SET name=?, address=?, phone=?, ticket_header=?, ticket_footer=?, price_round_mode=?, supabase_store_id=?
      WHERE id='default'
    `).run(data.name, data.address, data.phone, data.ticket_header, data.ticket_footer, data.price_round_mode, data.supabase_store_id || null)
    return { ok: true }
  })

  // ── CATEGORÍAS ──
  ipcMain.handle('categories:list', () => {
    return db.prepare('SELECT * FROM categories WHERE active=1 ORDER BY name').all()
  })

  ipcMain.handle('categories:create', (_, data) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO categories (id, name, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.name, data.color || '#6366f1', now, now)
    return db.prepare('SELECT * FROM categories WHERE id=?').get(id)
  })

  ipcMain.handle('categories:update', (_, data) => {
    db.prepare(`
      UPDATE categories SET name=?, color=?, updated_at=? WHERE id=?
    `).run(data.name, data.color, new Date().toISOString(), data.id)
    return db.prepare('SELECT * FROM categories WHERE id=?').get(data.id)
  })

  ipcMain.handle('categories:delete', (_, id) => {
    db.prepare('UPDATE categories SET active=0, updated_at=? WHERE id=?')
      .run(new Date().toISOString(), id)
    return { ok: true }
  })

  // ── PROVEEDORES ──
  ipcMain.handle('suppliers:list', () => {
    return db.prepare('SELECT * FROM suppliers WHERE active=1 ORDER BY name').all()
  })

  ipcMain.handle('suppliers:create', (_, data) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO suppliers (id, name, contact, phone, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.contact || null, data.phone || null, data.notes || null, now, now)
    return db.prepare('SELECT * FROM suppliers WHERE id=?').get(id)
  })

  ipcMain.handle('suppliers:update', (_, data) => {
    db.prepare(`
      UPDATE suppliers SET name=?, contact=?, phone=?, notes=?, updated_at=? WHERE id=?
    `).run(data.name, data.contact, data.phone, data.notes, new Date().toISOString(), data.id)
    return db.prepare('SELECT * FROM suppliers WHERE id=?').get(data.id)
  })

  ipcMain.handle('suppliers:delete', (_, id) => {
    db.prepare('UPDATE suppliers SET active=0, updated_at=? WHERE id=?')
      .run(new Date().toISOString(), id)
    return { ok: true }
  })

  // ── PRODUCTOS ──
  ipcMain.handle('products:list', (_, filters = {}) => {
    let query = `
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.active = 1 AND p.deleted_at IS NULL
    `
    const params = []
    if (filters.search) {
      query += ' AND (p.name LIKE ? OR p.barcode LIKE ?)'
      params.push(`%${filters.search}%`, `%${filters.search}%`)
    }
    if (filters.category_id) {
      query += ' AND p.category_id = ?'
      params.push(filters.category_id)
    }
    if (filters.supplier_id) {
      query += ' AND p.supplier_id = ?'
      params.push(filters.supplier_id)
    }
    if (filters.low_stock) {
      query += ' AND p.stock <= p.stock_min AND p.stock_min > 0'
    }
    query += ' ORDER BY p.name'
    return db.prepare(query).all(...params)
  })

  ipcMain.handle('products:getByBarcode', (_, barcode) => {
    return db.prepare(`
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.barcode = ? AND p.active = 1 AND p.deleted_at IS NULL
    `).get(barcode)
  })

  ipcMain.handle('products:create', (_, data) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    const price_auto = calcAutoPrice(data.cost, data.markup, data.round_mode)

    db.prepare(`
      INSERT INTO products (
        id, barcode, name, description, category_id, supplier_id,
        cost, markup, price_auto, price_manual, use_manual, round_mode,
        stock, stock_min, unit, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id, data.barcode || null, data.name, data.description || null,
      data.category_id || null, data.supplier_id || null,
      data.cost, data.markup, price_auto,
      data.price_manual || null, data.use_manual ? 1 : 0,
      data.round_mode || 'INHERIT',
      data.stock || 0, data.stock_min || 0,
      data.unit || 'un', now, now
    )

    insertPriceHistory(id, data.cost, data.markup, price_auto, data.user_id || 'admin', now)

    const created = getProductById(id)
    syncProduct(created)
    return created
  })

  ipcMain.handle('products:update', (_, data) => {
    const now = new Date().toISOString()
    const price_auto = calcAutoPrice(data.cost, data.markup, data.round_mode)
    const existing = db.prepare('SELECT cost, markup FROM products WHERE id=?').get(data.id)

    db.prepare(`
      UPDATE products SET
        barcode=?, name=?, description=?, category_id=?, supplier_id=?,
        cost=?, markup=?, price_auto=?, price_manual=?, use_manual=?,
        round_mode=?, stock_min=?, unit=?, updated_at=?, synced=0
      WHERE id=?
    `).run(
      data.barcode || null, data.name, data.description || null,
      data.category_id || null, data.supplier_id || null,
      data.cost, data.markup, price_auto,
      data.price_manual || null, data.use_manual ? 1 : 0,
      data.round_mode || 'INHERIT',
      data.stock_min || 0, data.unit || 'un',
      now, data.id
    )

    if (existing.cost !== data.cost || existing.markup !== data.markup) {
      insertPriceHistory(data.id, data.cost, data.markup, price_auto, data.user_id || 'admin', now)
    }

    const updated = getProductById(data.id)
    syncProduct(updated)
    return updated
  })

  ipcMain.handle('products:delete', (_, id) => {
    const now = new Date().toISOString()
    db.prepare('UPDATE products SET deleted_at=?, active=0, updated_at=?, synced=0 WHERE id=?')
      .run(now, now, id)
    return { ok: true }
  })

  // ── VENTAS ──
  ipcMain.handle('sales:create', (_, payload) => {
    const createSale = db.transaction((p) => {
      const saleId = randomUUID()
      const now = new Date().toISOString()

      const lastTicket = db.prepare('SELECT MAX(ticket_number) as max FROM sales').get()
      const ticketNumber = (lastTicket.max || 0) + 1

      db.prepare(`
        INSERT INTO sales (
          id, ticket_number, user_id, cash_register_id,
          subtotal, total, payment_method, amount_paid, change_given,
          status, printed, synced, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', 0, 0, ?)
      `).run(
        saleId, ticketNumber, p.user_id, p.cash_register_id,
        p.subtotal, p.total, p.payment_method,
        p.amount_paid || null, p.change_given || null, now
      )

      for (const item of p.items) {
        db.prepare(`
          INSERT INTO sale_items (id, sale_id, product_id, product_name, barcode, quantity, unit_price, unit_cost, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(), saleId, item.product_id, item.product_name,
          item.barcode || null, item.quantity, item.unit_price, item.unit_cost,
          item.quantity * item.unit_price
        )

        applyStockDelta(item.product_id, -item.quantity, 'SALE_OUT', saleId, p.user_id, now)
      }

      db.prepare(`
        INSERT INTO cash_movements (id, cash_register_id, type, amount, reference_id, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(), p.cash_register_id,
        p.payment_method === 'CASH' ? 'SALE_CASH' : 'SALE_TRANSFER',
        p.total, saleId, p.user_id, now
      )

      db.prepare(`
        INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, priority, status, created_at, updated_at)
        VALUES (?, 'sale', ?, 'INSERT', ?, 1, 'PENDING', ?, ?)
      `).run(randomUUID(), saleId, JSON.stringify({ saleId }), now, now)

      const sale = db.prepare('SELECT * FROM sales WHERE id=?').get(saleId)
      const saleItems = db.prepare('SELECT * FROM sale_items WHERE sale_id=?').all(saleId)
      syncSale(sale, saleItems)
      return sale
    })

    return createSale(payload)
  })

  ipcMain.handle('sales:list', (_, filters = {}) => {
    let query = 'SELECT * FROM sales WHERE 1=1'
    const params = []
    if (filters.date_from) { query += ' AND created_at >= ?'; params.push(filters.date_from) }
    if (filters.date_to)   { query += ' AND created_at <= ?'; params.push(filters.date_to) }
    if (filters.cash_register_id) { query += ' AND cash_register_id=?'; params.push(filters.cash_register_id) }
    query += ' ORDER BY created_at DESC'
    if (filters.limit) { query += ' LIMIT ?'; params.push(filters.limit) }
    return db.prepare(query).all(...params)
  })

  ipcMain.handle('sales:getItems', (_, saleId) => {
    return db.prepare('SELECT * FROM sale_items WHERE sale_id=?').all(saleId)
  })

  // ── CAJA ──
  ipcMain.handle('cashRegister:open', (_, data) => {
    const existing = db.prepare("SELECT id FROM cash_registers WHERE status='OPEN'").get()
    if (existing) return { error: 'Ya hay una caja abierta' }

    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO cash_registers (id, user_id, status, opening_amount, opened_at)
      VALUES (?, ?, 'OPEN', ?, ?)
    `).run(id, data.user_id, data.opening_amount, now)

    db.prepare(`
      INSERT INTO cash_movements (id, cash_register_id, type, amount, description, user_id, created_at)
      VALUES (?, ?, 'OPENING', ?, 'Apertura de caja', ?, ?)
    `).run(randomUUID(), id, data.opening_amount, data.user_id, now)

    const opened = db.prepare('SELECT * FROM cash_registers WHERE id=?').get(id)
    syncCashRegister(opened)
    const openingMov = db.prepare('SELECT * FROM cash_movements WHERE cash_register_id=? AND type=?').get(id, 'OPENING')
    if (openingMov) syncCashMovement(openingMov)
    return opened
  })

  ipcMain.handle('cashRegister:getCurrent', () => {
    return db.prepare("SELECT * FROM cash_registers WHERE status='OPEN' ORDER BY opened_at DESC LIMIT 1").get()
  })

  ipcMain.handle('cashRegister:close', (_, data) => {
    const register = db.prepare('SELECT id FROM cash_registers WHERE id=?').get(data.id)
    if (!register) return { error: 'Caja no encontrada' }

    const theoretical = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type='OPENING'    THEN  amount ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN type='SALE_CASH'  THEN  amount ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN type='MANUAL_IN'  THEN  amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type='MANUAL_OUT' THEN  amount ELSE 0 END), 0) as total
      FROM cash_movements WHERE cash_register_id=?
    `).get(data.id).total || 0

    const difference = data.closing_amount - theoretical
    const now = new Date().toISOString()

    db.prepare(`
      UPDATE cash_registers SET
        status='CLOSED', closing_amount=?, theoretical_amount=?,
        difference=?, notes=?, closed_at=?, synced=0
      WHERE id=?
    `).run(data.closing_amount, theoretical, difference, data.notes || null, now, data.id)

    db.prepare(`
      INSERT INTO cash_movements (id, cash_register_id, type, amount, description, user_id, created_at)
      VALUES (?, ?, 'CLOSING', ?, 'Cierre de caja', ?, ?)
    `).run(randomUUID(), data.id, data.closing_amount, data.user_id, now)

    const closed = db.prepare('SELECT * FROM cash_registers WHERE id=?').get(data.id)
    syncCashRegister(closed)
    return closed
  })

  ipcMain.handle('cashRegister:addMovement', (_, data) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO cash_movements (id, cash_register_id, type, amount, description, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.cash_register_id, data.type, data.amount, data.description || null, data.user_id, now)
    const mov = db.prepare('SELECT * FROM cash_movements WHERE id=?').get(id)
    syncCashMovement(mov)
    return mov
  })

  ipcMain.handle('cashRegister:getMovements', (_, registerId) => {
    return db.prepare('SELECT * FROM cash_movements WHERE cash_register_id=? ORDER BY created_at').all(registerId)
  })

  // ── COMPRAS ──
  ipcMain.handle('purchases:create', (_, data) => {
    const createPurchase = db.transaction((p) => {
      const purchaseId = randomUUID()
      const now = new Date().toISOString()
      let totalCost = 0

      db.prepare(`
        INSERT INTO purchases (id, supplier_id, user_id, total_cost, notes, status, created_at)
        VALUES (?, ?, ?, 0, ?, 'CONFIRMED', ?)
      `).run(purchaseId, p.supplier_id || null, p.user_id, p.notes || null, now)

      for (const item of p.items) {
        const subtotal = item.quantity * item.unit_cost
        totalCost += subtotal

        db.prepare(`
          INSERT INTO purchase_items (id, purchase_id, product_id, quantity, unit_cost, subtotal)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), purchaseId, item.product_id, item.quantity, item.unit_cost, subtotal)

        db.prepare('UPDATE products SET cost=?, updated_at=?, synced=0 WHERE id=?')
          .run(item.unit_cost, now, item.product_id)

        applyStockDelta(item.product_id, item.quantity, 'PURCHASE_IN', purchaseId, p.user_id, now)
      }

      db.prepare('UPDATE purchases SET total_cost=? WHERE id=?').run(totalCost, purchaseId)
      return db.prepare('SELECT * FROM purchases WHERE id=?').get(purchaseId)
    })

    return createPurchase(data)
  })

  ipcMain.handle('purchases:list', () => {
    return db.prepare(`
      SELECT p.*, s.name as supplier_name
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      ORDER BY p.created_at DESC
    `).all()
  })

  // ── REPORTES ──
  ipcMain.handle('reports:salesSummary', (_, filters = {}) => {
    const dateFrom = filters.date_from || new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z'
    const dateTo   = filters.date_to   || new Date().toISOString().slice(0, 10) + 'T23:59:59.999Z'

    const totals = db.prepare(`
      SELECT
        COUNT(*) as total_sales,
        SUM(total) as total_amount,
        SUM(CASE WHEN payment_method='CASH' THEN total ELSE 0 END) as cash_amount,
        SUM(CASE WHEN payment_method='TRANSFER' THEN total ELSE 0 END) as transfer_amount
      FROM sales
      WHERE status='COMPLETED' AND created_at BETWEEN ? AND ?
    `).get(dateFrom, dateTo)

    const topProducts = db.prepare(`
      SELECT
        si.product_name,
        SUM(si.quantity) as total_qty,
        SUM(si.subtotal) as total_amount,
        SUM(si.subtotal - (si.quantity * si.unit_cost)) as total_margin
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.status='COMPLETED' AND s.created_at BETWEEN ? AND ?
      GROUP BY si.product_id, si.product_name
      ORDER BY total_amount DESC
      LIMIT 10
    `).all(dateFrom, dateTo)

    const bySupplier = db.prepare(`
      SELECT
        COALESCE(sup.name, 'Sin proveedor') as supplier_name,
        SUM(si.subtotal) as total_amount,
        SUM(si.quantity) as total_qty
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      LEFT JOIN suppliers sup ON sup.id = p.supplier_id
      WHERE s.status='COMPLETED' AND s.created_at BETWEEN ? AND ?
      GROUP BY p.supplier_id, supplier_name
      ORDER BY total_amount DESC
    `).all(dateFrom, dateTo)

    const lowStock = db.prepare(`
      SELECT name, stock, stock_min, unit
      FROM products
      WHERE active=1 AND deleted_at IS NULL AND stock_min > 0 AND stock <= stock_min
      ORDER BY (stock - stock_min) ASC
    `).all()

    return { totals, topProducts, bySupplier, lowStock }
  })

  ipcMain.handle('reports:salesByDay', (_, filters = {}) => {
    const dateFrom = filters.date_from || new Date(Date.now() - 30 * 86400000).toISOString()
    const dateTo   = filters.date_to   || new Date().toISOString()
    return db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total_sales,
        SUM(total) as total_amount
      FROM sales
      WHERE status='COMPLETED' AND created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(dateFrom, dateTo)
  })

  // ── USUARIOS ──
  ipcMain.handle('users:login', (_, { name, password }) => {
    const user = db.prepare("SELECT id, name, role FROM users WHERE name=? AND pin=? AND active=1").get(name, password)
    if (!user) return { error: 'Usuario o contraseña incorrectos' }
    return user
  })

  ipcMain.handle('users:list', () => {
    return db.prepare('SELECT id, name, role, active, created_at FROM users WHERE active=1').all()
  })

  ipcMain.handle('users:create', (_, data) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO users (id, name, pin, role, created_at) VALUES (?, ?, ?, ?, ?)
    `).run(id, data.name, data.pin, data.role, now)
    return db.prepare('SELECT id, name, role, active FROM users WHERE id=?').get(id)
  })
}

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────

function calcAutoPrice(cost, markup, roundMode) {
  const raw = cost * (1 + markup / 100)
  return applyRounding(raw, roundMode)
}

function applyRounding(price, mode) {
  if (!mode || mode === 'NONE' || mode === 'INHERIT') return Math.round(price * 100) / 100
  const n = Number(mode)
  if (isNaN(n) || n === 0) return price
  return Math.ceil(price / n) * n
}

module.exports = { initDatabase, closeDatabase }
