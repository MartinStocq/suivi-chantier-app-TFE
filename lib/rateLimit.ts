interface Entry {
  count:   number
  resetAt: number
}

const store = new Map<string, Entry>()

// Nettoyage périodique pour éviter les fuites mémoire
setInterval(() => {
  const now = Date.now()
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key)
  })
}, 60_000)

export function rateLimit(
  key:      string,
  limit:    number,
  windowMs: number
): { success: boolean; remaining: number; resetAt: number } {
  const now   = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'anonymous'
  )
}