'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{
      padding: 18, borderRadius: 14, background: 'var(--danger-tint)',
      border: '1px solid var(--danger-300)', color: 'var(--danger-500)', fontSize: 13,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>No pudimos cargar las compras</div>
      <div style={{ fontSize: 12 }}>{error.message}</div>
      <button onClick={reset} style={{
        marginTop: 10, padding: '8px 12px', borderRadius: 8,
        background: 'var(--danger-500)', color: '#fff', border: 'none',
        cursor: 'pointer', fontSize: 12, fontWeight: 600,
      }}>Reintentar</button>
    </div>
  )
}
