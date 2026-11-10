import { HttpError } from './errors.js'

// Small in-memory per-user limiter. Good enough for a single server process;
// use a shared store (e.g. Redis) if you run several instances.
export function rateLimit({ windowMs, max, message }) {
  const hits = new Map()

  return (req, _res, next) => {
    const key = req.user?.id ?? req.ip
    const now = Date.now()
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= max) {
      throw new HttpError(429, message ?? 'Too many requests, please wait a moment')
    }
    recent.push(now)
    hits.set(key, recent)
    next()
  }
}
