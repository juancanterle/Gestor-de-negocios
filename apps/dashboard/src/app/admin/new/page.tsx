'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewStorePage() {
  const [storeName, setStoreName] = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [result, setResult]       = useState<{ storeId: string; storeName: string } | null>(null)
  const router = useRouter()

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
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 16px', minHeight: '100vh', background: '#f8fafc' }}>
        <div style={card}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>Local creado</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
            Ya podés instalar la app en la PC del local y configurarla con este ID.
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={row}>
              <span style={rowLabel}>Local</span>
              <span style={rowValue}>{result.storeName}</span>
            </div>
            <div style={row}>
              <span style={rowLabel}>Email</span>
              <span style={rowValue}>{email}</span>
            </div>
            <div style={row}>
              <span style={rowLabel}>Contraseña</span>
              <span style={rowValue}>{password}</span>
            </div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={rowLabel}>Store ID</span>
              <span style={{ ...rowValue, fontFamily: 'monospace', fontSize: 11, color: '#6366f1', wordBreak: 'break-all' }}>
                {result.storeId}
              </span>
            </div>
          </div>

          <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#854d0e', marginBottom: 20 }}>
            Guardá estos datos antes de cerrar. La contraseña no se puede recuperar.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { setResult(null); setStoreName(''); setEmail(''); setPassword('') }}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Crear otro
            </button>
            <Link
              href="/admin"
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}
            >
              Volver al panel
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 16px', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Link href="/admin" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 20 }}>←</Link>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Nuevo local</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={lbl}>Nombre del local</label>
            <input
              type="text"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              style={inp}
              placeholder="Kiosco de Pepe"
              autoFocus
              required
            />
          </div>
          <div>
            <label style={lbl}>Email del dueño</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inp}
              placeholder="pepe@gmail.com"
              required
            />
          </div>
          <div>
            <label style={lbl}>Contraseña</label>
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inp}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              El dueño usará esta contraseña para entrar al dashboard.
            </div>
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: 13, background: '#ef444415', border: '1px solid #ef444444', borderRadius: 8, padding: '8px 12px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!storeName || !email || !password || loading}
            style={{
              padding: '12px 0', borderRadius: 10, border: 'none', marginTop: 4,
              background: storeName && email && password ? '#6366f1' : '#e2e8f0',
              color: storeName && email && password ? '#fff' : '#94a3b8',
              fontSize: 15, fontWeight: 600,
              cursor: storeName && email && password ? 'pointer' : 'default',
            }}
          >
            {loading ? 'Creando...' : 'Crear local'}
          </button>
        </form>
      </div>
    </div>
  )
}

const card: React.CSSProperties  = { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const lbl: React.CSSProperties   = { display: 'block', fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: 500 }
const inp: React.CSSProperties   = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', fontSize: 14, outline: 'none', boxSizing: 'border-box' }
const row: React.CSSProperties   = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }
const rowLabel: React.CSSProperties = { fontSize: 12, color: '#94a3b8', fontWeight: 500 }
const rowValue: React.CSSProperties = { fontSize: 13, color: '#1e293b', fontWeight: 600 }
