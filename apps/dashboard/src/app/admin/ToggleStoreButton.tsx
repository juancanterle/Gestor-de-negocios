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
        fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: active ? '#fef2f2' : '#f0fdf4',
        color:      active ? '#ef4444' : '#22c55e',
      }}
    >
      {loading ? '...' : active ? 'Desactivar' : 'Activar'}
    </button>
  )
}
