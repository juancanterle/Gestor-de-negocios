'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    setLoading(false)
    if (res.ok) {
      const data = await res.json()
      router.push(data.isAdmin ? '/admin' : '/dashboard')
    } else {
      const data = await res.json()
      setError(data.error || 'Credenciales incorrectas')
    }
  }

  const canSubmit = email.length > 0 && password.length > 0 && !loading

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-login)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 20px 28px',
    }}>
      {/* Logo lockup */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 32 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 22,
          background: 'var(--g-logo)',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 12px 30px -8px rgba(99,102,241,0.5)',
          color: '#fff',
        }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3h18v4H3zM5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7"/><path d="M9 12h6"/>
          </svg>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#f5f7fa', letterSpacing: '-0.015em' }}>
          KioscoApp
        </div>
      </div>

      {/* Glass form card */}
      <form onSubmit={handleSubmit} style={{
        marginTop: 'auto', width: '100%', maxWidth: 380,
        padding: '28px 24px 24px', borderRadius: 28,
        background: 'linear-gradient(180deg, rgba(40,48,66,0.55), rgba(30,36,50,0.55))',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.6)',
      }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f5f7fa', letterSpacing: '-0.015em', textAlign: 'center' }}>
          Entrá a tu panel
        </h2>
        <p style={{ margin: '6px 0 0', textAlign: 'center', fontSize: 12, color: '#a3a9b7' }}>
          Ventas, caja y stock en vivo
        </p>

        <GlassField label="Email">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoFocus
            required
            style={glassInput}
          />
        </GlassField>

        <GlassField label="Contraseña">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={glassInput}
          />
        </GlassField>

        {error && (
          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 10,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5', fontSize: 12,
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            width: '100%', padding: 14, marginTop: 20,
            background: canSubmit
              ? 'linear-gradient(135deg, #6366f1, #38bdf8)'
              : 'rgba(255,255,255,0.06)',
            border: 'none', borderRadius: 14,
            color: canSubmit ? '#fff' : '#6a718a',
            fontSize: 15, fontWeight: 700, letterSpacing: 0.3,
            boxShadow: canSubmit ? '0 12px 24px -10px rgba(56,189,248,0.55)' : 'none',
            cursor: canSubmit ? 'pointer' : 'default',
            transition: 'transform var(--dur-fast) var(--ease-out)',
          }}
        >
          {loading ? 'Verificando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

function GlassField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5,
        fontWeight: 600, color: '#6a718a', marginBottom: 6,
      }}>{label}</div>
      <div style={{
        background: 'rgba(15,19,27,0.6)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {children}
      </div>
    </div>
  )
}

const glassInput: React.CSSProperties = {
  background: 'transparent', border: 'none', outline: 'none',
  color: '#f5f7fa', flex: 1, fontSize: 14,
  fontFamily: 'inherit',
}
