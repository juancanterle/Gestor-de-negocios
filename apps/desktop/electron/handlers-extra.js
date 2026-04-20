const { app } = require('electron')
const { safeHandler, IpcError } = require('./ipc-helpers')
const { buildAndRecordTicket, printHtmlSilently } = require('./printing')
const { createBackup, exportCsv } = require('./backup')
const syncQueue = require('./sync-queue')
const { supabase, getStoreId } = require('./sync')

function registerExtraHandlers(db) {
  syncQueue.init({ db, supabase, getStoreId })
  syncQueue.start(60 * 1000)

  // ── app ──
  safeHandler('app:getVersion', () => ({
    version: app.getVersion(),
    name: app.getName(),
    electron: process.versions.electron,
    node: process.versions.node,
    platform: process.platform,
  }))

  safeHandler('app:checkUpdates', async () => {
    return { available: false, currentVersion: app.getVersion() }
  }, { requireAuth: true })

  // ── sync ──
  safeHandler('sync:status', () => syncQueue.status(), { requireAuth: true })

  safeHandler('sync:manual', async () => {
    return await syncQueue.processQueue({ manual: true })
  }, { requireAuth: true })

  // ── print ──
  safeHandler('print:ticket', async (_, { saleId }) => {
    if (!saleId) throw new IpcError('saleId requerido')
    const { ticketId, html } = buildAndRecordTicket(db, saleId, null)
    await printHtmlSilently(html)
    return { ticketId }
  }, { requireAuth: true })

  safeHandler('print:reprint', async (_, { saleId, originalTicketId }) => {
    if (!saleId) throw new IpcError('saleId requerido')
    const { ticketId, html } = buildAndRecordTicket(db, saleId, originalTicketId || null)
    await printHtmlSilently(html)
    return { ticketId }
  }, { requireAuth: true })

  // ── backup ──
  safeHandler('backup:create', async (_, opts = {}) => {
    const res = await createBackup(db, opts)
    return res
  }, { requireRole: 'OWNER' })

  // ── export ──
  safeHandler('export:csv', async (_, { table, filters = {} } = {}) => {
    const allowed = {
      sales: () => {
        let q = `SELECT s.id, s.ticket_number, s.created_at, s.total, s.subtotal, s.payment_method, s.status
                 FROM sales s WHERE 1=1`
        const params = []
        if (filters.date_from) { q += ' AND s.created_at >= ?'; params.push(filters.date_from) }
        if (filters.date_to)   { q += ' AND s.created_at <= ?'; params.push(filters.date_to) }
        q += ' ORDER BY s.created_at DESC'
        return db.prepare(q).all(...params)
      },
      products: () => db.prepare(`
        SELECT p.id, p.barcode, p.name, p.cost, p.markup, p.price_auto, p.price_manual, p.use_manual,
               p.stock, p.stock_min, p.unit,
               c.name as category_name, s.name as supplier_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN suppliers s ON s.id = p.supplier_id
        WHERE p.active = 1 AND p.deleted_at IS NULL
        ORDER BY p.name
      `).all(),
      purchases: () => db.prepare(`
        SELECT p.id, p.created_at, p.total_cost, p.status, sup.name as supplier_name
        FROM purchases p LEFT JOIN suppliers sup ON sup.id = p.supplier_id
        ORDER BY p.created_at DESC
      `).all(),
      audit: () => db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10000').all(),
    }
    const getter = allowed[table]
    if (!getter) throw new IpcError(`Tabla no permitida para export: ${table}`, 'BAD_TABLE')
    const rows = getter()
    const res = await exportCsv(rows, table)
    return res
  }, { requireRole: 'MANAGER' })
}

module.exports = { registerExtraHandlers }
