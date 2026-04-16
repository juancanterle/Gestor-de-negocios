const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://ghwdnzqwtfcrqyrrurkr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdod2RuenF3dGZjcnF5cnJ1cmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMDY2MjQsImV4cCI6MjA5MTg4MjYyNH0.l4HYgN-vl4j_XaKY6P9iZkAEYL7XE00vRT0i1vdKa-8'

let client = null

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
  try {
    await supabase().from('sales').upsert({
      id: sale.id,
      store_id: sale.store_id || 'default',
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
  try {
    await supabase().from('products').upsert({
      id: product.id,
      store_id: product.store_id || 'default',
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
  try {
    await supabase().from('cash_registers').upsert({
      id: register.id,
      store_id: register.store_id || 'default',
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
  try {
    await supabase().from('cash_movements').upsert({
      id: movement.id,
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

module.exports = { syncSale, syncProduct, syncCashRegister, syncCashMovement }
