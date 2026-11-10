import { db } from '../supabase.js'
import { must } from '../lib/errors.js'

const TTL_MS = 5 * 60 * 1000
let cached = null
let cachedAt = 0

// Departments and categories change rarely, so they are cached briefly.
export async function getCatalog() {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached

  const [departments, categories] = await Promise.all([
    db.from('departments').select('id, name').order('name').then(must),
    db.from('categories').select('id, name, default_department_id').order('name').then(must),
  ])
  cached = { departments, categories }
  cachedAt = Date.now()
  return cached
}
