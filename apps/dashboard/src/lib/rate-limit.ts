// In-memory sliding-window rate limiter.
// Para despliegues multi-instancia reemplazar por Upstash Redis
// (@upstash/ratelimit). Single-instance Vercel/Node basta para arrancar.

type Entry = { hits: number[]; blockedUntil: number }
const buckets = new Map<string, Entry>()

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSec: number
}

export function checkRateLimit(
  key: string,
  { windowMs, max }: { windowMs: number; max: number }
): RateLimitResult {
  const now = Date.now()
  let e = buckets.get(key)
  if (!e) {
    e = { hits: [], blockedUntil: 0 }
    buckets.set(key, e)
  }

  if (e.blockedUntil > now) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((e.blockedUntil - now) / 1000) }
  }

  e.hits = e.hits.filter(t => now - t < windowMs)

  if (e.hits.length >= max) {
    e.blockedUntil = now + windowMs
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil(windowMs / 1000) }
  }

  e.hits.push(now)
  return { ok: true, remaining: max - e.hits.length, retryAfterSec: 0 }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}

// GC ocasional: limpia claves muertas cada 10 min en cold path.
setInterval(() => {
  const now = Date.now()
  for (const [k, e] of buckets) {
    if (e.blockedUntil < now && e.hits.length === 0) buckets.delete(k)
  }
}, 10 * 60 * 1000).unref?.()
