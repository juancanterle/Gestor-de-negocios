import { useState, useRef, useEffect } from 'react'
import { Store } from 'lucide-react'
import { T, labelStyle } from '../theme'
import { inp } from '../styles/inputs'
import type { User } from '../types/api'

interface Props { onLogin: (user: User) => void }

export default function LoginScreen({ onLogin }: Props) {
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !password.trim()) return
    setLoading(true)
    setError('')
    const result = await window.api.users.login({ name: name.trim(), password })
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      setPassword('')
    } else {
      const { id, name: userName, role, active } = result.data
      onLogin({ id, name: userName, role, active })
    }
  }

  return (
    <div style={{
      height: '100vh', background: T.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    }}>
      {/* Fondo decorativo */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
        <div style={{ position: 'absolute', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${T.primary}08, transparent 70%)` }} />
        <div style={{ position: 'absolute', bottom: -200, right: -200, width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${T.cash}06, transparent 70%)` }} />
      </div>

      <div style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: T.rXl,
        padding: '44px 48px', width: 400, position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 16,
            background: T.gradPrimary,
            marginBottom: 16, boxShadow: T.shadowPrimary,
          }}>
            <Store size={26} color="#fff" aria-hidden="true" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: T.text, letterSpacing: '-0.5px' }}>
            KioscoApp
          </div>
          <div style={{ color: T.sub, fontSize: 13, marginTop: 4 }}>
            Ingresá con tu usuario y contraseña
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label htmlFor="login-name" style={labelStyle}>Usuario</label>
            <input
              id="login-name"
              ref={nameRef}
              value={name}
              onChange={e => setName(e.target.value)}
              style={inp}
              placeholder="Ej: Administrador"
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="login-password" style={labelStyle}>Contraseña</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inp}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div role="alert" style={{
              color: T.danger, fontSize: 13, background: T.dangerBg,
              border: `1px solid ${T.danger}55`, borderRadius: T.r,
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!name.trim() || !password.trim() || loading}
            style={{
              marginTop: 6, padding: '14px 0', borderRadius: T.r, border: 'none',
              background: name.trim() && password.trim() ? T.gradPrimary : T.border,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: name.trim() && password.trim() ? 'pointer' : 'default',
              transition: 'opacity 0.15s', opacity: loading ? 0.7 : 1,
              boxShadow: name.trim() && password.trim() ? T.shadowPrimary : 'none',
            }}
          >
            {loading ? 'Verificando...' : 'Ingresar al sistema'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', color: T.faint, fontSize: 11, borderTop: `1px solid ${T.border}`, paddingTop: 18 }}>
          Por defecto: <span style={{ color: T.sub }}>Administrador</span> / <span style={{ color: T.sub }}>1234</span>
        </div>
      </div>
    </div>
  )
}
