const Database = require('better-sqlite3-multiple-ciphers')
const { app } = require('electron')
const path = require('path')
const fs = require('fs')
const { randomUUID } = require('crypto')
const { setDb } = require('./sync')
const syncQueue = require('./sync-queue')
const { getOrCreateDbKey, hashPin, verifyPin, isBcryptHash } = require('./security')
const { safeHandler, IpcError } = require('./ipc-helpers')
const { createSession, getSession, clearSession } = require('./session')
const { registerExtraHandlers } = require('./handlers-extra')
const { calcAutoPrice } = require('./pricing')

let db

function initDatabase() {
  const dbPath = app.isPackaged
    ? path.join(app.getPath('userData'), 'kiosco.db')
    : path.join(app.getPath('userData'), 'kiosco-dev.db')

  const key = getOrCreateDbKey()
  openEncrypted(dbPath, key)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations()
  setDb(db)
  registerHandlers()
  registerExtraHandlers(db)

  console.log('[db] DB cifrada lista en', dbPath)
}

function closeDatabase() {
  try { require('./sync-queue').stop() } catch {}
  if (db) db.close()
}

// ─────────────────────────────────────────
// APERTURA + MIGRACIÓN A CIFRADO
// ─────────────────────────────────────────

function openEncrypted(dbPath, hexKey) {
  const keyLiteral = `"x'${hexKey}'"`
  const exists = fs.existsSync(dbPath)

  if (!exists) {
    db = new Database(dbPath)
    db.pragma(`key = ${keyLiteral}`)
    db.prepare('SELECT count(*) FROM sqlite_master').get()
    return
  }

  db = new Database(dbPath)
  db.pragma(`key = ${keyLiteral}`)
  try {
    db.prepare('SELECT count(*) FROM sqlite_master').get()
    return
  } catch {
    try { db.close() } catch {}
  }

  db = new Database(dbPath)
  try {
    db.prepare('SELECT count(*) FROM sqlite_master').get()
  } catch (e) {
    try { db.close() } catch {}
    throw new Error(`No se pudo abrir la DB (key inválida o DB corrupta): ${e.message}`)
  }

  console.log('[db] DB legacy sin cifrar detectada — migrando a cifrada…')
  migrateLegacyToEncrypted(dbPath, hexKey)

  db = new Database(dbPath)
  db.pragma(`key = ${keyLiteral}`)
  db.prepare('SELECT count(*) FROM sqlite_master').get()
  console.log('[db] Migración a DB cifrada completada. Backup en', dbPath + '.legacy.bak')
}

function migrateLegacyToEncrypted(dbPath, hexKey) {
  const bakPath = dbPath + '.legacy.bak'

  // Backup before encrypting in place
  if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath)
  fs.copyFileSync(dbPath, bakPath)

  // rekey requires DELETE journal mode (not WAL)
  db.pragma('journal_mode = DELETE')
  db.pragma(`rekey = "x'${hexKey}'"`)
  db.close()
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
    { name: '001_initial_schema',       sql: migration001 },
    { name: '002_supabase_store_id',    sql: migration002 },
    { name: '003_pin_hashing_columns',  sql: migration003 },
    { name: '004_tickets_audit_logins', sql: migration004 },
  ]

  const ran = db.prepare('SELECT name FROM migrations').all().map(r => r.name)

  for (const m of migrations) {
    if (!ran.includes(m.name)) {
      try {
        db.exec(m.sql)
      } catch (e) {
        console.warn('Migración con advertencia:', m.name, e.message)
      }
      db.prepare('INSERT INTO migrations (name, run_at) VALUES (?, ?)').run(m.name, new Date().toISOString())
      console.log('Migración ejecutada:', m.name)
    }
  }

  hashPinsInPlace()
}

function hashPinsInPlace() {
  const users = db.prepare('SELECT id, pin, pin_migrated FROM users').all()
  const stmt = db.prepare('UPDATE users SET pin=?, pin_migrated=1, must_change_pin=? WHERE id=?')
  const markOnly = db.prepare('UPDATE users SET pin_migrated=1 WHERE id=?')
  for (const u of users) {
    if (u.pin_migrated === 1) continue
    if (!u.pin) { markOnly.run(u.id); continue }
    if (isBcryptHash(u.pin)) { markOnly.run(u.id); continue }
    const mustChange = u.pin === '1234' ? 1 : 0
    stmt.run(hashPin(u.pin), mustChange, u.id)
    console.log(`[pin-migration] usuario ${u.id} migrado a bcrypt`)
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

const migration003 = `
  ALTER TABLE users ADD COLUMN pin_migrated    INTEGER DEFAULT 0;
  ALTER TABLE users ADD COLUMN must_change_pin INTEGER DEFAULT 0;
  ALTER TABLE users ADD COLUMN last_login_at   TEXT;
`

const migration004 = `
  CREATE TABLE IF NOT EXISTS tickets (
    id          TEXT PRIMARY KEY,
    sale_id     TEXT NOT NULL REFERENCES sales(id),
    html        TEXT NOT NULL,
    printed_at  TEXT NOT NULL,
    reprint_of  TEXT,
    user_id     TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_tickets_sale ON tickets(sale_id);

  CREATE TABLE IF NOT EXISTS audit_log (
    id          TEXT PRIMARY KEY,
    user_id     TEXT,
    user_name   TEXT,
    action      TEXT NOT NULL,
    entity_type TEXT,
    entity_id   TEXT,
    metadata    TEXT,
    created_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);

  CREATE TABLE IF NOT EXISTS login_attempts (
    id         TEXT PRIMARY KEY,
    user_name  TEXT NOT NULL,
    success    INTEGER NOT NULL,
    ip         TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(user_name, created_at);
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

function audit(action, { entityType, entityId, metadata } = {}) {
  const s = getSession()
  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO audit_log (id, user_id, user_name, action, entity_type, entity_id, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    s?.userId || null,
    s?.name || null,
    action,
    entityType || null,
    entityId || null,
    metadata ? JSON.stringify(metadata) : null,
    now,
  )
  try { syncQueue.enqueueAndKick({ entityType: 'audit', entityId: id, priority: 8 }) } catch {}
}

// ─────────────────────────────────────────
// IPC HANDLERS
// ─────────────────────────────────────────

function registerHandlers() {
  // ── AUTH ──
  safeHandler('auth:login', (_, { name, password }) => {
    const row = db.prepare("SELECT id, name, role, pin, active, must_change_pin FROM users WHERE name=? AND active=1").get(name)
    db.prepare(`
      INSERT INTO login_attempts (id, user_name, success, created_at)
      VALUES (?, ?, ?, ?)
    `).run(randomUUID(), name, row && verifyPin(password, row.pin) ? 1 : 0, new Date().toISOString())

    if (!row || !verifyPin(password, row.pin)) {
      throw new IpcError('Usuario o contraseña incorrectos', 'BAD_CREDENTIALS')
    }

    db.prepare('UPDATE users SET last_login_at=? WHERE id=?').run(new Date().toISOString(), row.id)
    const session = createSession({ id: row.id, name: row.name, role: row.role })
    audit('auth.login')
    return {
      user: { id: row.id, name: row.name, role: row.role, active: row.active, must_change_pin: row.must_change_pin },
      session,
    }
  })

  safeHandler('auth:current', () => {
    const s = getSession()
    if (!s) return null
    const u = db.prepare('SELECT id, name, role, active, must_change_pin FROM users WHERE id=?').get(s.userId)
    return { user: u, session: s }
  })

  safeHandler('auth:logout', () => {
    audit('auth.logout')
    clearSession()
    return { ok: true }
  })

  safeHandler('auth:touch', () => {
    const s = getSession()
    return s ? { ok: true, session: s } : { ok: false }
  })

  // ── STORE ──
  safeHandler('store:get', () => {
    return db.prepare('SELECT * FROM store WHERE id = ?').get('default')
  }, { requireAuth: true })

  safeHandler('store:update', (_, data) => {
    db.prepare(`
      UPDATE store SET name=?, address=?, phone=?, ticket_header=?, ticket_footer=?, price_round_mode=?, supabase_store_id=?
      WHERE id='default'
    `).run(data.name, data.address, data.phone, data.ticket_header, data.ticket_footer, data.price_round_mode, data.supabase_store_id || null)
    audit('store.update', { entityType: 'store', entityId: 'default' })
    return { id: 'default' }
  }, { requireRole: 'OWNER' })

  // ── CATEGORÍAS ──
  safeHandler('categories:list', () => {
    return db.prepare('SELECT * FROM categories WHERE active=1 ORDER BY name').all()
  }, { requireAuth: true })

  safeHandler('categories:create', (_, data) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO categories (id, name, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.name, data.color || '#6366f1', now, now)
    audit('categories.create', { entityType: 'category', entityId: id })
    return db.prepare('SELECT * FROM categories WHERE id=?').get(id)
  }, { requireRole: 'MANAGER' })

  safeHandler('categories:update', (_, data) => {
    db.prepare(`
      UPDATE categories SET name=?, color=?, updated_at=? WHERE id=?
    `).run(data.name, data.color, new Date().toISOString(), data.id)
    audit('categories.update', { entityType: 'category', entityId: data.id })
    return db.prepare('SELECT * FROM categories WHERE id=?').get(data.id)
  }, { requireRole: 'MANAGER' })

  safeHandler('categories:delete', (_, id) => {
    db.prepare('UPDATE categories SET active=0, updated_at=? WHERE id=?')
      .run(new Date().toISOString(), id)
    audit('categories.delete', { entityType: 'category', entityId: id })
    return { id }
  }, { requireRole: 'MANAGER' })

  // ── PROVEEDORES ──
  safeHandler('suppliers:list', () => {
    return db.prepare('SELECT * FROM suppliers WHERE active=1 ORDER BY name').all()
  }, { requireAuth: true })

  safeHandler('suppliers:create', (_, data) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO suppliers (id, name, contact, phone, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.contact || null, data.phone || null, data.notes || null, now, now)
    audit('suppliers.create', { entityType: 'supplier', entityId: id })
    return db.prepare('SELECT * FROM suppliers WHERE id=?').get(id)
  }, { requireRole: 'MANAGER' })

  safeHandler('suppliers:update', (_, data) => {
    db.prepare(`
      UPDATE suppliers SET name=?, contact=?, phone=?, notes=?, updated_at=? WHERE id=?
    `).run(data.name, data.contact, data.phone, data.notes, new Date().toISOString(), data.id)
    audit('suppliers.update', { entityType: 'supplier', entityId: data.id })
    return db.prepare('SELECT * FROM suppliers WHERE id=?').get(data.id)
  }, { requireRole: 'MANAGER' })

  safeHandler('suppliers:delete', (_, id) => {
    db.prepare('UPDATE suppliers SET active=0, updated_at=? WHERE id=?')
      .run(new Date().toISOString(), id)
    audit('suppliers.delete', { entityType: 'supplier', entityId: id })
    return { id }
  }, { requireRole: 'MANAGER' })

  // ── PRODUCTOS ──
  safeHandler('products:list', (_, filters = {}) => {
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
  }, { requireAuth: true })

  safeHandler('products:getByBarcode', (_, barcode) => {
    return db.prepare(`
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.barcode = ? AND p.active = 1 AND p.deleted_at IS NULL
    `).get(barcode)
  }, { requireAuth: true })

  safeHandler('products:create', (_, data) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    const price_auto = calcAutoPrice(data.cost, data.markup, data.round_mode)
    const session = getSession()

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

    insertPriceHistory(id, data.cost, data.markup, price_auto, session?.userId || 'admin', now)
    audit('products.create', { entityType: 'product', entityId: id })

    const created = getProductById(id)
    syncQueue.enqueueAndKick({ entityType: 'product', entityId: id })
    return created
  }, { requireRole: 'MANAGER' })

  safeHandler('products:update', (_, data) => {
    const now = new Date().toISOString()
    const price_auto = calcAutoPrice(data.cost, data.markup, data.round_mode)
    const existing = db.prepare('SELECT cost, markup FROM products WHERE id=?').get(data.id)
    const session = getSession()

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
      insertPriceHistory(data.id, data.cost, data.markup, price_auto, session?.userId || 'admin', now)
    }
    audit('products.update', { entityType: 'product', entityId: data.id })

    const updated = getProductById(data.id)
    syncQueue.enqueueAndKick({ entityType: 'product', entityId: data.id })
    return updated
  }, { requireRole: 'MANAGER' })

  safeHandler('products:delete', (_, id) => {
    const now = new Date().toISOString()
    db.prepare('UPDATE products SET deleted_at=?, active=0, updated_at=?, synced=0 WHERE id=?')
      .run(now, now, id)
    audit('products.delete', { entityType: 'product', entityId: id })
    syncQueue.enqueueAndKick({ entityType: 'product', entityId: id, operation: 'DELETE' })
    return { id }
  }, { requireRole: 'MANAGER' })

  // ── VENTAS ──
  safeHandler('sales:create', (_, payload) => {
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

      const sale = db.prepare('SELECT * FROM sales WHERE id=?').get(saleId)
      return sale
    })

    const sale = createSale(payload)
    syncQueue.enqueueAndKick({ entityType: 'sale', entityId: sale.id, priority: 1 })
    audit('sales.create', { entityType: 'sale', entityId: sale.id, metadata: { total: sale.total } })
    return sale
  }, { requireAuth: true })

  safeHandler('sales:list', (_, filters = {}) => {
    let query = 'SELECT * FROM sales WHERE 1=1'
    const params = []
    if (filters.date_from) { query += ' AND created_at >= ?'; params.push(filters.date_from) }
    if (filters.date_to)   { query += ' AND created_at <= ?'; params.push(filters.date_to) }
    if (filters.cash_register_id) { query += ' AND cash_register_id=?'; params.push(filters.cash_register_id) }
    query += ' ORDER BY created_at DESC'
    if (filters.limit) { query += ' LIMIT ?'; params.push(filters.limit) }
    return db.prepare(query).all(...params)
  }, { requireAuth: true })

  safeHandler('sales:getItems', (_, saleId) => {
    return db.prepare('SELECT * FROM sale_items WHERE sale_id=?').all(saleId)
  }, { requireAuth: true })

  // ── CAJA ──
  safeHandler('cashRegister:open', (_, data) => {
    const existing = db.prepare("SELECT id FROM cash_registers WHERE status='OPEN'").get()
    if (existing) throw new IpcError('Ya hay una caja abierta', 'CASH_ALREADY_OPEN')

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
    const openingMov = db.prepare('SELECT * FROM cash_movements WHERE cash_register_id=? AND type=?').get(id, 'OPENING')
    syncQueue.enqueueAndKick({ entityType: 'cash_register', entityId: id })
    if (openingMov) syncQueue.enqueueAndKick({ entityType: 'cash_movement', entityId: openingMov.id })
    audit('cashRegister.open', { entityType: 'cash_register', entityId: id })
    return opened
  }, { requireAuth: true })

  safeHandler('cashRegister:getCurrent', () => {
    return db.prepare("SELECT * FROM cash_registers WHERE status='OPEN' ORDER BY opened_at DESC LIMIT 1").get()
  }, { requireAuth: true })

  safeHandler('cashRegister:close', (_, data) => {
    const register = db.prepare('SELECT id FROM cash_registers WHERE id=?').get(data.id)
    if (!register) throw new IpcError('Caja no encontrada', 'CASH_NOT_FOUND')

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
    syncQueue.enqueueAndKick({ entityType: 'cash_register', entityId: data.id })
    audit('cashRegister.close', { entityType: 'cash_register', entityId: data.id, metadata: { difference } })
    return closed
  }, { requireAuth: true })

  safeHandler('cashRegister:addMovement', (_, data) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO cash_movements (id, cash_register_id, type, amount, description, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.cash_register_id, data.type, data.amount, data.description || null, data.user_id, now)
    const mov = db.prepare('SELECT * FROM cash_movements WHERE id=?').get(id)
    syncQueue.enqueueAndKick({ entityType: 'cash_movement', entityId: id })
    audit('cashRegister.addMovement', { entityType: 'cash_movement', entityId: id, metadata: { type: data.type, amount: data.amount } })
    return mov
  }, { requireAuth: true })

  safeHandler('cashRegister:getMovements', (_, registerId) => {
    return db.prepare('SELECT * FROM cash_movements WHERE cash_register_id=? ORDER BY created_at').all(registerId)
  }, { requireAuth: true })

  // ── COMPRAS ──
  safeHandler('purchases:create', (_, data) => {
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

    const purchase = createPurchase(data)
    syncQueue.enqueueAndKick({ entityType: 'purchase', entityId: purchase.id })
    audit('purchases.create', { entityType: 'purchase', entityId: purchase.id, metadata: { total: purchase.total_cost } })
    return purchase
  }, { requireRole: 'MANAGER' })

  safeHandler('purchases:list', () => {
    return db.prepare(`
      SELECT p.*, s.name as supplier_name
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      ORDER BY p.created_at DESC
    `).all()
  }, { requireAuth: true })

  // ── REPORTES ──
  safeHandler('reports:salesSummary', (_, filters = {}) => {
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
  }, { requireAuth: true })

  safeHandler('reports:salesByDay', (_, filters = {}) => {
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
  }, { requireAuth: true })

  // ── USUARIOS ──
  // users:login se mantiene como alias compat de auth:login
  safeHandler('users:login', async (event, payload) => {
    const row = db.prepare("SELECT id, name, role, pin, active, must_change_pin FROM users WHERE name=? AND active=1").get(payload.name)
    db.prepare(`INSERT INTO login_attempts (id, user_name, success, created_at) VALUES (?, ?, ?, ?)`).run(
      randomUUID(), payload.name, row && verifyPin(payload.password, row.pin) ? 1 : 0, new Date().toISOString()
    )
    if (!row || !verifyPin(payload.password, row.pin)) {
      throw new IpcError('Usuario o contraseña incorrectos', 'BAD_CREDENTIALS')
    }
    db.prepare('UPDATE users SET last_login_at=? WHERE id=?').run(new Date().toISOString(), row.id)
    const session = createSession({ id: row.id, name: row.name, role: row.role })
    audit('auth.login')
    return { id: row.id, name: row.name, role: row.role, active: row.active, must_change_pin: row.must_change_pin, sessionId: session.sessionId }
  })

  safeHandler('users:list', () => {
    return db.prepare('SELECT id, name, role, active, created_at, last_login_at, must_change_pin FROM users WHERE active=1').all()
  }, { requireRole: 'MANAGER' })

  safeHandler('users:create', (_, data) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    const hash = hashPin(data.pin)
    db.prepare(`
      INSERT INTO users (id, name, pin, role, pin_migrated, must_change_pin, created_at)
      VALUES (?, ?, ?, ?, 1, 0, ?)
    `).run(id, data.name, hash, data.role, now)
    audit('users.create', { entityType: 'user', entityId: id, metadata: { role: data.role } })
    return db.prepare('SELECT id, name, role, active FROM users WHERE id=?').get(id)
  }, { requireRole: 'OWNER' })

  safeHandler('users:changePin', (_, { userId, currentPin, newPin }) => {
    const session = getSession()
    if (!session) throw new IpcError('Sesión requerida', 'AUTH_REQUIRED')

    const targetId = userId || session.userId
    const isSelf = targetId === session.userId
    if (!isSelf && session.role !== 'OWNER') {
      throw new IpcError('Solo OWNER puede cambiar PIN de otros', 'FORBIDDEN')
    }

    const user = db.prepare('SELECT id, pin FROM users WHERE id=? AND active=1').get(targetId)
    if (!user) throw new IpcError('Usuario no encontrado', 'USER_NOT_FOUND')

    if (isSelf) {
      if (!verifyPin(currentPin, user.pin)) {
        throw new IpcError('PIN actual incorrecto', 'BAD_CREDENTIALS')
      }
    }
    const hash = hashPin(newPin)
    db.prepare('UPDATE users SET pin=?, pin_migrated=1, must_change_pin=0 WHERE id=?').run(hash, targetId)
    audit('users.changePin', { entityType: 'user', entityId: targetId })
    return { id: targetId }
  }, { requireAuth: true })
}

module.exports = { initDatabase, closeDatabase }
