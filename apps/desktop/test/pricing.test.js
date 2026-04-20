import { describe, it, expect } from 'vitest'
import pricing from '../electron/pricing.js'

const {
  applyRounding,
  calcAutoPrice,
  calcChange,
  calcTheoreticalCash,
  calcCashDifference,
} = pricing

describe('applyRounding', () => {
  it('redondea a 2 decimales en NONE', () => {
    expect(applyRounding(123.456, 'NONE')).toBe(123.46)
    expect(applyRounding(99.999, 'NONE')).toBe(100)
  })
  it('redondea hacia arriba al múltiplo', () => {
    expect(applyRounding(123.01, '10')).toBe(130)
    expect(applyRounding(100, '10')).toBe(100)
    expect(applyRounding(151, '50')).toBe(200)
    expect(applyRounding(1001, '100')).toBe(1100)
  })
  it('INHERIT se comporta como NONE (2 decimales)', () => {
    expect(applyRounding(10.125, 'INHERIT')).toBe(10.13)
  })
  it('modo inválido devuelve el valor tal cual', () => {
    expect(applyRounding(10.5, 'PESO')).toBe(10.5)
  })
})

describe('calcAutoPrice', () => {
  it('aplica markup y luego redondeo', () => {
    expect(calcAutoPrice(100, 50, 'NONE')).toBe(150)
    expect(calcAutoPrice(100, 50, '10')).toBe(150)
    expect(calcAutoPrice(100, 53, '10')).toBe(160)
  })
  it('costo 0 devuelve 0', () => {
    expect(calcAutoPrice(0, 100, 'NONE')).toBe(0)
  })
  it('markup 0 devuelve el costo', () => {
    expect(calcAutoPrice(123.45, 0, 'NONE')).toBe(123.45)
  })
  it('maneja entradas nulas/indefinidas sin romper', () => {
    expect(calcAutoPrice(null, 50, 'NONE')).toBe(0)
    expect(calcAutoPrice(100, null, 'NONE')).toBe(100)
  })
})

describe('calcChange', () => {
  it('devuelve el vuelto correcto', () => {
    expect(calcChange(350, 500)).toBe(150)
  })
  it('no devuelve vuelto negativo', () => {
    expect(calcChange(500, 300)).toBe(0)
  })
  it('vuelto exacto es 0', () => {
    expect(calcChange(100, 100)).toBe(0)
  })
  it('redondea a 2 decimales', () => {
    expect(calcChange(33.33, 100)).toBe(66.67)
  })
})

describe('calcTheoreticalCash', () => {
  it('suma apertura + ventas en efectivo + movimientos in, resta out', () => {
    const movements = [
      { type: 'OPENING',    amount: 1000 },
      { type: 'SALE_CASH',  amount: 500 },
      { type: 'SALE_CASH',  amount: 250 },
      { type: 'MANUAL_IN',  amount: 100 },
      { type: 'MANUAL_OUT', amount: 300 },
    ]
    expect(calcTheoreticalCash(movements)).toBe(1550)
  })
  it('ignora transferencias', () => {
    const movements = [
      { type: 'OPENING',       amount: 1000 },
      { type: 'SALE_TRANSFER', amount: 9999 },
    ]
    expect(calcTheoreticalCash(movements)).toBe(1000)
  })
  it('array vacío devuelve 0', () => {
    expect(calcTheoreticalCash([])).toBe(0)
    expect(calcTheoreticalCash(null)).toBe(0)
  })
})

describe('calcCashDifference', () => {
  it('calcula diferencia negativa (falta plata)', () => {
    expect(calcCashDifference(1400, 1500)).toBe(-100)
  })
  it('calcula diferencia positiva (sobra plata)', () => {
    expect(calcCashDifference(1600, 1500)).toBe(100)
  })
  it('diferencia cero cuando coincide', () => {
    expect(calcCashDifference(1500, 1500)).toBe(0)
  })
})
