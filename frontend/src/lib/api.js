import { supabase } from './supabase.js'

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function request(method, path, body) {
  const { data } = await supabase.auth.getSession()
  const headers = {}
  if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`

  let payload
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(`${BASE}/api${path}`, { method, headers, body: payload })
  } catch {
    throw new ApiError(0, 'Cannot reach the UniVoice server. Check your connection and try again.')
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, json.error ?? `Request failed (${res.status})`)
  return json
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
}
