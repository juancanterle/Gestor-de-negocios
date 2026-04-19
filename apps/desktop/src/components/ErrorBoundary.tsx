import { Component, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { T } from '../theme'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 16,
        background: T.bg, padding: 32,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}>
        <AlertCircle size={48} color={T.danger} strokeWidth={1.5} />
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Algo salió mal</div>
        <div style={{ color: T.sub, fontSize: 14, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
          {this.state.error.message || 'Error inesperado en la aplicación'}
        </div>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: T.r, border: 'none',
            background: T.primary, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} /> Reintentar
        </button>
      </div>
    )
  }
}
