const { BrowserWindow } = require('electron')
const { randomUUID } = require('crypto')

function formatARS(n) {
  if (n == null) return ''
  return '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function renderTicketHtml({ sale, items, store, reprintOf }) {
  const lineas = items.map(i => `
    <tr>
      <td>${escapeHtml(i.product_name)}</td>
      <td style="text-align:right">${Number(i.quantity)}</td>
      <td style="text-align:right">${formatARS(i.unit_price)}</td>
      <td style="text-align:right">${formatARS(i.subtotal)}</td>
    </tr>
  `).join('')

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Ticket #${sale.ticket_number}</title>
<style>
  body { font-family: monospace; font-size: 12px; width: 72mm; margin: 0; padding: 8px; }
  h1, h2 { margin: 4px 0; text-align: center; font-size: 14px; }
  .meta { margin-bottom: 6px; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  td { padding: 2px 0; }
  .tot { font-size: 13px; font-weight: bold; border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px; }
  .foot { margin-top: 8px; text-align: center; font-size: 10px; }
  .reprint { text-align: center; font-size: 10px; color: #444; border: 1px dashed #000; padding: 2px; margin: 4px 0; }
</style></head>
<body>
  <h1>${escapeHtml(store?.name || '')}</h1>
  ${store?.address ? `<div class="meta" style="text-align:center">${escapeHtml(store.address)}</div>` : ''}
  ${store?.ticket_header ? `<div class="meta">${escapeHtml(store.ticket_header)}</div>` : ''}
  ${reprintOf ? `<div class="reprint">*** REIMPRESIÓN ***</div>` : ''}
  <div class="meta">
    Ticket #${sale.ticket_number}<br>
    ${new Date(sale.created_at).toLocaleString('es-AR')}
  </div>
  <table>${lineas}</table>
  <div class="tot">Subtotal: ${formatARS(sale.subtotal)}</div>
  <div class="tot">TOTAL:    ${formatARS(sale.total)}</div>
  <div class="meta">Pago: ${sale.payment_method === 'CASH' ? 'Efectivo' : 'Transferencia'}</div>
  ${sale.amount_paid ? `<div class="meta">Recibido: ${formatARS(sale.amount_paid)}</div>` : ''}
  ${sale.change_given ? `<div class="meta">Vuelto: ${formatARS(sale.change_given)}</div>` : ''}
  <div class="foot">${escapeHtml(store?.ticket_footer || 'Gracias por su compra')}</div>
</body></html>`
}

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function printHtmlSilently(html) {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true },
  })
  try {
    const dataUrl = 'data:text/html;charset=utf-8;base64,' + Buffer.from(html).toString('base64')
    await win.loadURL(dataUrl)
    await new Promise((resolve, reject) => {
      win.webContents.print(
        { silent: true, printBackground: true, margins: { marginType: 'none' } },
        (success, err) => success ? resolve(null) : reject(new Error(err || 'print falló'))
      )
    })
  } finally {
    if (!win.isDestroyed()) win.close()
  }
}

function buildAndRecordTicket(db, saleId, reprintOf = null) {
  const sale = db.prepare('SELECT * FROM sales WHERE id=?').get(saleId)
  if (!sale) throw new Error('Venta no encontrada')
  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id=?').all(saleId)
  const store = db.prepare('SELECT * FROM store WHERE id=?').get('default')
  const html = renderTicketHtml({ sale, items, store, reprintOf })

  const ticketId = randomUUID()
  db.prepare(`
    INSERT INTO tickets (id, sale_id, html, printed_at, reprint_of, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(ticketId, saleId, html, new Date().toISOString(), reprintOf, sale.user_id)

  if (!reprintOf) {
    db.prepare('UPDATE sales SET printed=1 WHERE id=?').run(saleId)
  }

  return { ticketId, html }
}

module.exports = { renderTicketHtml, printHtmlSilently, buildAndRecordTicket }
