'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ToggleStoreButton({ storeId, active }: { storeId: string; active: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    await fetch(`/api/admin/stores/${storeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      style={{
        fontSize: 12, fontWeight: 600, padding: '6px 12px',
        borderRadius: 999, cursor: loading ? 'default' : 'pointer',
        background: active ? 'var(--danger-tint)' : 'var(--success-tint)',
        color:      active ? 'var(--danger-500)' : 'var(--success-600)',
        border:     active ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(34,197,94,0.25)',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? '…' : active ? 'Desactivar' : 'Activar'}
    </button>
  )
}
