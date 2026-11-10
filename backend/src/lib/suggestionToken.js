import crypto from 'node:crypto'
import { config } from '../config.js'

// The AI suggestion is signed so that, when the issue is submitted, the server
// can trust the ai_* values came from its own classifier and were not typed in
// by the client.

const TTL_MS = 60 * 60 * 1000

function sign(payload) {
  return crypto.createHmac('sha256', config.suggestionSecret).update(payload).digest('base64url')
}

export function createSuggestionToken(userId, suggestion) {
  const payload = Buffer.from(
    JSON.stringify({
      u: userId,
      c: suggestion.categoryId,
      d: suggestion.departmentId,
      p: suggestion.priority,
      exp: Date.now() + TTL_MS,
    }),
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

// Returns { categoryId, departmentId, priority } or null if the token is
// missing, tampered with, expired, or belongs to another user.
export function readSuggestionToken(token, userId) {
  if (typeof token !== 'string') return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (data.u !== userId || data.exp < Date.now()) return null
    return { categoryId: data.c, departmentId: data.d, priority: data.p }
  } catch {
    return null
  }
}
