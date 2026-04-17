const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://ghwdnzqwtfcrqyrrurkr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdod2RuenF3dGZjcnF5cnJ1cmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMDY2MjQsImV4cCI6MjA5MTg4MjYyNH0.l4HYgN-vl4j_XaKY6P9iZkAEYL7XE00vRT0i1vdKa-8'

let client = null
let _db = null   // referencia a la instancia de better-sqlite3, inyectada desde database.js

// database.js llama a esto justo después de initDatabase()
function setDb(dbInstance) {
  _db = dbInstance
}

function getStoreId() {
  if (!_db) return null
  const row = _db.prepare("SELECT supabase_store_id FROM store WHERE id='default'").get()
  return row?.supabase_store_id || null
}

function supabase() {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    })
  }
  return client
}

// Fire-and-forget: nunca bloquea el proceso local
async function syncSale(sale, items) {
  const storeId = getStoreId()
  if (!storeId) return   // sin store_id configurado no sincroniza
  try {
    await supabase().from('sales').upsert({
      id: sale.id,
      store_id: storeId,
      ticket_number: sale.ticket_number,
      total: sale.total,
      subtotal: sale.subtotal,
      payment_method: sale.payment_method,
      status: sale.status,
      created_at: sale.created_at,
    })
    if (items?.length) {
      await supabase().from('sale_items').upsert(
        items.map(i => ({
          id: i.id,
          sale_id: sale.id,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          unit_cost: i.unit_cost,
          subtotal: i.subtotal,
        }))
      )
    }
  } catch (e) {
    console.warn('[sync] sale:', e.message)
  }
}

async function syncProduct(product) {
  const storeId = getStoreId()
  if (!storeId) return
  try {
    await supabase().from('products').upsert({
      id: product.id,
      store_id: storeId,
      name: product.name,
      barcode: product.barcode || null,
      stock: product.stock,
      stock_min: product.stock_min,
      unit: product.unit,
      cost: product.cost,
      price_auto: product.price_auto,
      price_manual: product.price_manual || null,
      use_manual: product.use_manual,
      category_name: product.category_name || null,
      supplier_name: product.supplier_name || null,
      updated_at: product.updated_at,
    })
  } catch (e) {
    console.warn('[sync] product:', e.message)
  }
}

async function syncCashRegister(register) {
  const storeId = getStoreId()
  if (!storeId) return
  try {
    await supabase().from('cash_registers').upsert({
      id: register.id,
      store_id: storeId,
      status: register.status,
      opening_amount: register.opening_amount,
      closing_amount: register.closing_amount || null,
      theoretical_amount: register.theoretical_amount || null,
      difference: register.difference || null,
      notes: register.notes || null,
      opened_at: register.opened_at,
      closed_at: register.closed_at || null,
    })
  } catch (e) {
    console.warn('[sync] cash_register:', e.message)
  }
}

async function syncCashMovement(movement) {
  const storeId = getStoreId()
  if (!storeId) return
  try {
    await supabase().from('cash_movements').upsert({
      id: movement.id,
      store_id: storeId,
      cash_register_id: movement.cash_register_id,
      type: movement.type,
      amount: movement.amount,
      description: movement.description || null,
      created_at: movement.created_at,
    })
  } catch (e) {
    console.warn('[sync] cash_movement:', e.message)
  }
}

module.exports = { setDb, syncSale, syncProduct, syncCashRegister, syncCashMovement }
