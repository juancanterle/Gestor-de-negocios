import type { CSSProperties } from 'react'
import { T } from '../theme'

export const inp: CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: T.r,
  border: `1.5px solid ${T.border}`, background: T.input,
  color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box',
}

export const sel: CSSProperties = {
  padding: '10px 12px', borderRadius: T.r,
  border: `1.5px solid ${T.border}`, background: T.input,
  color: T.sub, fontSize: 13, outline: 'none',
}

export const primaryBtn: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '10px 18px', borderRadius: T.r, border: 'none',
  background: T.primaryD, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}

export const cancelBtn: CSSProperties = {
  padding: '10px 18px', borderRadius: T.r,
  border: `1.5px solid ${T.border}`, background: 'transparent',
  color: T.sub, fontSize: 13, cursor: 'pointer',
}

export const iconBtn: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: T.sub, padding: 6,
  minWidth: 28, minHeight: 28,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 4,
  transition: 'color 120ms',
}

export const qtyBtn: CSSProperties = {
  width: 28, height: 28, borderRadius: 8,
  border: `1px solid ${T.border}`,
  background: T.surface, color: T.text,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

export const dangerBtn: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '10px 18px', borderRadius: T.r, border: 'none',
  background: T.danger, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
