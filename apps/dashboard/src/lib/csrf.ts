// Chequeo CSRF mínimo: el Origin de la request debe coincidir con el host
// servido por Next (o con ALLOWED_ORIGINS extra). Para formularios legítimos
// el navegador envía Origin; si falta, exigimos Referer.

export function verifySameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const host = req.headers.get('host')
  if (!host) return false

  const expectedOrigins = new Set<string>()
  expectedOrigins.add(`https://${host}`)
  expectedOrigins.add(`http://${host}`)

  const extra = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  extra.forEach(o => expectedOrigins.add(o))

  if (origin) return expectedOrigins.has(origin)
  if (referer) {
    try {
      const u = new URL(referer)
      return expectedOrigins.has(`${u.protocol}//${u.host}`)
    } catch {
      return false
    }
  }
  return false
}
