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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
      <div style={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 16, padding: '40px 48px', width: 340 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#6366f1', marginBottom: 6 }}>KioscoApp</div>
          <div style={{ color: '#64748b', fontSize: 13 }}>Acceso al panel</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={lbl}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inp}
              placeholder="tu@email.com"
              autoFocus
            />
          </div>
          <div>
            <label style={lbl}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inp}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: 13, background: '#ef444415', border: '1px solid #ef444444', borderRadius: 8, padding: '8px 12px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!email || !password || loading}
            style={{
              padding: '12px 0', borderRadius: 10, border: 'none',
              background: email && password ? '#6366f1' : '#2a2d3a',
              color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: email && password ? 'pointer' : 'default', marginTop: 4,
            }}
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5, fontWeight: 500 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2d3a', background: '#0f1117', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }
