import { useState, useRef, useEffect } from 'react'
import type { User } from '../types/api'

interface Props {
  onLogin: (user: User) => void
}

const $ = {
  bg: '#0f1117', surface: '#1a1d27', border: '#2a2d3a',
  text: '#e2e8f0', muted: '#64748b', primary: '#6366f1',
  danger: '#ef4444',
}

export default function LoginScreen({ onLogin }: Props) {
  const [name, setName]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !password.trim()) return
    setLoading(true)
    setError('')
    const result = await window.api.users.login({ name: name.trim(), password })
    setLoading(false)
    if ('error' in result) {
      setError(result.error)
      setPassword('')
    } else {
      onLogin(result as User)
    }
  }

  return (
    <div style={{
      height: '100vh',
      background: $.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: $.surface,
        border: `1px solid ${$.border}`,
        borderRadius: 16,
        padding: '40px 48px',
        width: 380,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: $.primary, marginBottom: 6 }}>
            KioscoApp
          </div>
          <div style={{ color: $.muted, fontSize: 13 }}>
            Ingresá con tu usuario y contraseña
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={lbl}>Usuario</label>
            <input
              ref={nameRef}
              value={name}
              onChange={e => setName(e.target.value)}
              style={inp}
              placeholder="Ej: Administrador"
              autoComplete="username"
            />
          </div>

          <div>
            <label style={lbl}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inp}
              placeholder="••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{
              color: $.danger,
              fontSize: 13,
              background: `${$.danger}15`,
              border: `1px solid ${$.danger}44`,
              borderRadius: 8,
              padding: '8px 12px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!name.trim() || !password.trim() || loading}
            style={{
              marginTop: 4,
              padding: '12px 0',
              borderRadius: 10,
              border: 'none',
              background: name.trim() && password.trim() ? $.primary : $.border,
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: name.trim() && password.trim() ? 'pointer' : 'default',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', color: '#374151', fontSize: 11 }}>
          Usuario por defecto: <span style={{ color: $.muted }}>Administrador</span> · Contraseña: <span style={{ color: $.muted }}>1234</span>
        </div>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5, fontWeight: 500 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2d3a', background: '#0f1117', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }
