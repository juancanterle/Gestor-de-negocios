import { useState } from 'react'
import type { User } from '../types/api'

interface Props {
  onLogin: (user: User) => void
}

export default function LoginScreen({ onLogin }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await window.api.users.login({ pin })
    setLoading(false)
    if ('error' in result) {
      setError(result.error)
      setPin('')
    } else {
      onLogin(result as User)
    }
  }

  const addDigit = (d: string) => {
    if (pin.length < 4) {
      const next = pin + d
      setPin(next)
      if (next.length === 4) {
        // Auto-submit al completar el PIN
        window.api.users.login({ pin: next }).then(result => {
          if ('error' in result) {
            setError(result.error)
            setPin('')
          } else {
            onLogin(result as User)
          }
        })
      }
    }
  }

  const delDigit = () => setPin(p => p.slice(0, -1))

  return (
    <div style={{
      height: '100vh',
      background: '#0f1117',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 32,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#6366f1', marginBottom: 4 }}>
          KioscoApp
        </div>
        <div style={{ color: '#64748b', fontSize: 14 }}>Ingresá tu PIN para continuar</div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {/* PIN display */}
        <div style={{ display: 'flex', gap: 12 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 48, height: 48,
              borderRadius: 10,
              background: '#1a1d27',
              border: `2px solid ${pin.length > i ? '#6366f1' : '#2a2d3a'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, color: '#6366f1',
              transition: 'border-color 0.15s',
            }}>
              {pin.length > i ? '●' : ''}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>
        )}

        {/* Teclado numérico */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {(['1','2','3','4','5','6','7','8','9'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => addDigit(d)}
              style={{
                width: 64, height: 64,
                borderRadius: 12,
                border: '1px solid #2a2d3a',
                background: '#1a1d27',
                color: '#e2e8f0',
                fontSize: 20,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {d}
            </button>
          ))}
          <div style={{ width: 64, height: 64 }} />
          <button
            type="button"
            onClick={() => addDigit('0')}
            style={{
              width: 64, height: 64,
              borderRadius: 12,
              border: '1px solid #2a2d3a',
              background: '#1a1d27',
              color: '#e2e8f0',
              fontSize: 20,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >0</button>
          <button
            type="button"
            onClick={delDigit}
            style={{
              width: 64, height: 64,
              borderRadius: 12,
              border: '1px solid #2a2d3a',
              background: '#1a1d27',
              color: '#ef4444',
              fontSize: 20,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >⌫</button>
        </div>

        <button
          type="submit"
          disabled={pin.length < 4 || loading}
          style={{
            width: '100%',
            padding: '12px 0',
            borderRadius: 10,
            border: 'none',
            background: pin.length === 4 ? '#6366f1' : '#2a2d3a',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: pin.length === 4 ? 'pointer' : 'default',
            transition: 'background 0.15s',
          }}
        >
          {loading ? 'Verificando...' : 'Ingresar'}
        </button>
      </form>

      <div style={{ color: '#374151', fontSize: 12 }}>
        PIN por defecto: 1234
      </div>
    </div>
  )
}
