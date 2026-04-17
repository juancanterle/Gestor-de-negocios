'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function NewStorePage() {
  const [storeName, setStoreName] = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [result, setResult]       = useState<{ storeId: string; storeName: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeName, email, password }),
    })

    setLoading(false)
    if (res.ok) {
      const data = await res.json()
      setResult({ storeId: data.store.id, storeName: data.store.name })
    } else {
      const data = await res.json()
      setError(data.error || 'Error al crear el local')
    }
  }

  if (result) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--success-tint)', color: 'var(--success-600)',
            display: 'grid', placeItems: 'center', marginBottom: 16,
          }}>
            <CheckIcon />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-strong)', letterSpacing: '-0.2px' }}>
            Local creado
          </h1>
          <p style={{ margin: '6px 0 20px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Ya podés instalar la app en la PC del local y configurarla con este ID.
          </p>

          <dl style={{
            background: 'var(--bg-lower)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '4px 16px', margin: '0 0 16px',
          }}>
            <Row label="Local"       value={result.storeName} />
            <Row label="Email"       value={email} />
            <Row label="Contraseña"  value={password} />
            <Row label="Store ID"    value={result.storeId} mono last />
          </dl>

          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 12, color: '#854d0e', marginBottom: 20,
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <AlertIcon />
            <span>Guardá estos datos antes de cerrar. La contraseña no se puede recuperar.</span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setResult(null); setStoreName(''); setEmail(''); setPassword('') }}
              style={secondaryBtn}
            >
              Crear otro
            </button>
            <Link href="/admin" style={primaryBtn}>
              Volver al panel
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const canSubmit = storeName && email && password && !loading

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Link href="/admin" style={{
            width: 36, height: 36, borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surface)',
            display: 'grid', placeItems: 'center',
            color: 'var(--text-muted)', textDecoration: 'none',
          }}>
            <BackIcon />
          </Link>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '-0.2px' }}>
            Nuevo local
          </h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Nombre del local">
            <input
              type="text"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              placeholder="Kiosco de Pepe"
              autoFocus
              required
              style={inp}
            />
          </Field>
          <Field label="Email del dueño">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="pepe@gmail.com"
              required
              style={inp}
            />
          </Field>
          <Field label="Contraseña" hint="La usa el dueño para entrar al dashboard.">
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              style={inp}
            />
          </Field>

          {error && (
            <div style={{
              color: 'var(--danger-500)', fontSize: 13,
              background: 'var(--danger-tint)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10, padding: '10px 12px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: '12px 16px', borderRadius: 10, border: 'none', marginTop: 4,
              background: canSubmit ? 'var(--brand-500)' : 'var(--surface-2)',
              color:      canSubmit ? '#fff' : 'var(--text-dim)',
              fontSize: 14, fontWeight: 700, letterSpacing: 0.1,
              cursor: canSubmit ? 'pointer' : 'default',
              boxShadow: canSubmit ? '0 6px 16px -8px rgba(99,102,241,0.55)' : 'none',
            }}
          >
            {loading ? 'Creando…' : 'Crear local'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, color: 'var(--text-muted)',
        fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
      }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function Row({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 12,
      padding: '10px 0', borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: mono ? 11 : 13, color: mono ? 'var(--brand-500)' : 'var(--text-strong)',
        fontFamily: mono ? 'var(--font-mono)' : 'inherit', fontWeight: 600,
        wordBreak: 'break-all', textAlign: 'right',
      }}>{value}</span>
    </div>
  )
}

function CheckIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
}
function BackIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
}
function AlertIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
}

const pageStyle: React.CSSProperties = {
  maxWidth: 520, margin: '0 auto', padding: '32px 16px', minHeight: '100vh', background: 'var(--bg)',
}
const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-xs)',
}
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 14, outline: 'none',
  fontFamily: 'inherit',
}
const primaryBtn: React.CSSProperties = {
  flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
  background: 'var(--brand-500)', color: '#fff',
  fontSize: 14, fontWeight: 700, cursor: 'pointer',
  textAlign: 'center', textDecoration: 'none',
}
const secondaryBtn: React.CSSProperties = {
  flex: 1, padding: '10px 0', borderRadius: 10,
  border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text-strong)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit',
}
