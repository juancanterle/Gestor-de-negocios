// Lógica pura — sin side effects, testeable en Node puro.
// Unica fuente de verdad para cálculo de precios y cierres de caja.

function applyRounding(price, mode) {
  if (!mode || mode === 'NONE' || mode === 'INHERIT') {
    return Math.round(price * 100) / 100
  }
  const n = Number(mode)
  if (isNaN(n) || n === 0) return price
  return Math.ceil(price / n) * n
}

function calcAutoPrice(cost, markup, roundMode) {
  const raw = (Number(cost) || 0) * (1 + (Number(markup) || 0) / 100)
  return applyRounding(raw, roundMode)
}

function calcChange(total, amountPaid) {
  const c = (Number(amountPaid) || 0) - (Number(total) || 0)
  return c < 0 ? 0 : Math.round(c * 100) / 100
}

function calcTheoreticalCash(movements) {
  let sum = 0
  for (const m of movements || []) {
    const amt = Number(m.amount) || 0
    switch (m.type) {
      case 'OPENING':
      case 'SALE_CASH':
      case 'MANUAL_IN':
        sum += amt
        break
      case 'MANUAL_OUT':
        sum -= amt
        break
    }
  }
  return Math.round(sum * 100) / 100
}

function calcCashDifference(closingAmount, theoretical) {
  return Math.round(((Number(closingAmount) || 0) - (Number(theoretical) || 0)) * 100) / 100
}

module.exports = {
  applyRounding,
  calcAutoPrice,
  calcChange,
  calcTheoreticalCash,
  calcCashDifference,
}
