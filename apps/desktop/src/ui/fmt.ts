export const fmt = (n: number) =>
  n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  })

export const fmtNumber = (n: number) =>
  n.toLocaleString('es-AR', { maximumFractionDigits: 2 })

export const fmtPct = (n: number) =>
  `${n.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

export const fmtDateLong = (d: Date = new Date()) => {
  const s = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
