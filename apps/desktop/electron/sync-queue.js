const { randomUUID } = require('crypto')
const { net } = require('electron')

let _db = null
let _supabase = null
let _getStoreId = null
let _timer = null
let _processing = false
let _lastSync = null
let _lastError = null

function init({ db, supabase, getStoreId }) {
  _db = db
  _supabase = supabase
  _getStoreId = getStoreId
}

function enqueue({ entityType, entityId, operation = 'UPSERT', payload = {}, priority = 5 }) {
  const now = new Date().toISOString()
  _db.prepare(`
    INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, priority, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).run(randomUUID(), entityType, entityId, operation, JSON.stringify(payload), priority, now, now)
}

function enqueueAndKick(item) {
  enqueue(item)
  setImmediate(() => processQueue().catch(e => console.warn('[sync-queue]', e.message)))
}

function isOnline() {
  try { return net.isOnline() } catch { return true }
}

function backoffMs(attempts) {
  const base = Math.min(2000 * Math.pow(2, attempts), 5 * 60 * 1000)
  return base + Math.floor(Math.random() * 500)
}

async function processOne(item) {
  const payload = safeJson(item.payload)
  switch (item.entity_type) {
    case 'sale': {
      const sale = _db.prepare('SELECT * FROM sales WHERE id=?').get(item.entity_id)
      if (!sale) return
      const items = _db.prepare('SELECT * FROM sale_items WHERE sale_id=?').all(item.entity_id)
      await _supabase().from('sales').upsert({
        id: sale.id,
        store_id: _getStoreId(),
        ticket_number: sale.ticket_number,
        total: sale.total,
        subtotal: sale.subtotal,
        payment_method: sale.payment_method,
        status: sale.status,
        created_at: sale.created_at,
      })
      if (items.length) {
        await _supabase().from('sale_items').upsert(
          items.map(i => ({
            id: i.id, sale_id: sale.id, product_name: i.product_name,
            quantity: i.quantity, unit_price: i.unit_price, unit_cost: i.unit_cost,
            subtotal: i.subtotal,
          }))
        )
      }
      _db.prepare('UPDATE sales SET synced=1 WHERE id=?').run(sale.id)
      return
    }
    case 'product': {
      const p = _db.prepare('SELECT * FROM products WHERE id=?').get(item.entity_id)
      if (!p) return
      await _supabase().from('products').upsert({
        id: p.id, store_id: _getStoreId(), name: p.name, barcode: p.barcode || null,
        stock: p.stock, stock_min: p.stock_min, unit: p.unit, cost: p.cost,
        price_auto: p.price_auto, price_manual: p.price_manual || null, use_manual: p.use_manual,
        updated_at: p.updated_at,
      })
      _db.prepare('UPDATE products SET synced=1 WHERE id=?').run(p.id)
      return
    }
    case 'cash_register': {
      const r = _db.prepare('SELECT * FROM cash_registers WHERE id=?').get(item.entity_id)
      if (!r) return
      await _supabase().from('cash_registers').upsert({
        id: r.id, store_id: _getStoreId(), status: r.status,
        opening_amount: r.opening_amount, closing_amount: r.closing_amount || null,
        theoretical_amount: r.theoretical_amount || null, difference: r.difference || null,
        notes: r.notes || null, opened_at: r.opened_at, closed_at: r.closed_at || null,
      })
      _db.prepare('UPDATE cash_registers SET synced=1 WHERE id=?').run(r.id)
      return
    }
    case 'cash_movement': {
      const m = _db.prepare('SELECT * FROM cash_movements WHERE id=?').get(item.entity_id)
      if (!m) return
      await _supabase().from('cash_movements').upsert({
        id: m.id, store_id: _getStoreId(), cash_register_id: m.cash_register_id,
        type: m.type, amount: m.amount, description: m.description || null, created_at: m.created_at,
      })
      _db.prepare('UPDATE cash_movements SET synced=1 WHERE id=?').run(m.id)
      return
    }
    case 'purchase': {
      const p = _db.prepare('SELECT * FROM purchases WHERE id=?').get(item.entity_id)
      if (!p) return
      await _supabase().from('purchases').upsert({
        id: p.id, store_id: _getStoreId(), supplier_id: p.supplier_id || null,
        total_cost: p.total_cost, notes: p.notes || null, status: p.status, created_at: p.created_at,
      })
      _db.prepare('UPDATE purchases SET synced=1 WHERE id=?').run(p.id)
      return
    }
    case 'audit': {
      const a = _db.prepare('SELECT * FROM audit_log WHERE id=?').get(item.entity_id)
      if (!a) return
      await _supabase().from('audit_log_remote').insert({
        store_id: _getStoreId(),
        user_id: a.user_id, user_name: a.user_name,
        action: a.action, entity_type: a.entity_type, entity_id: a.entity_id,
        metadata: a.metadata ? safeJson(a.metadata) : null,
        created_at: a.created_at,
      })
      return
    }
    default:
      console.warn('[sync-queue] tipo no soportado:', item.entity_type)
  }
  void payload
}

function safeJson(s) { try { return JSON.parse(s) } catch { return null } }

async function processQueue({ manual = false } = {}) {
  if (_processing) return { skipped: 'already-running' }
  if (!isOnline() && !manual) return { skipped: 'offline' }
  if (!_getStoreId || !_getStoreId()) return { skipped: 'no-store-id' }

  _processing = true
  let processed = 0
  let failed = 0
  try {
    const pending = _db.prepare(`
      SELECT * FROM sync_queue
      WHERE status='PENDING'
      ORDER BY priority ASC, created_at ASC
      LIMIT 50
    `).all()

    for (const item of pending) {
      try {
        await processOne(item)
        _db.prepare("UPDATE sync_queue SET status='DONE', updated_at=? WHERE id=?")
          .run(new Date().toISOString(), item.id)
        processed++
      } catch (e) {
        failed++
        _lastError = e.message
        const nextAttempts = (item.attempts || 0) + 1
        const giveUp = nextAttempts >= 8
        _db.prepare(`
          UPDATE sync_queue
          SET attempts=?, last_error=?, status=?, updated_at=?
          WHERE id=?
        `).run(nextAttempts, e.message, giveUp ? 'FAILED' : 'PENDING', new Date().toISOString(), item.id)
        console.warn(`[sync-queue] item ${item.id} falló (${nextAttempts}/8):`, e.message)
      }
    }
    _lastSync = new Date().toISOString()
    return { processed, failed, total: pending.length }
  } finally {
    _processing = false
  }
}

function start(intervalMs = 60 * 1000) {
  stop()
  _timer = setInterval(() => { processQueue().catch(e => console.warn('[sync-queue]', e.message)) }, intervalMs)
}

function stop() {
  if (_timer) { clearInterval(_timer); _timer = null }
}

function status() {
  const pending = _db?.prepare("SELECT COUNT(*) as c FROM sync_queue WHERE status='PENDING'").get()?.c || 0
  const failed = _db?.prepare("SELECT COUNT(*) as c FROM sync_queue WHERE status='FAILED'").get()?.c || 0
  return {
    online: isOnline(),
    processing: _processing,
    pending,
    failed,
    lastSync: _lastSync,
    lastError: _lastError,
  }
}

module.exports = { init, enqueue, enqueueAndKick, processQueue, start, stop, status }
