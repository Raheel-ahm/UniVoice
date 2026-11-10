import { db } from '../supabase.js'
import { HttpError } from '../lib/errors.js'

// Verifies the Supabase access token sent by the browser and loads the
// caller's profile. Role and department always come from the database,
// never from the request.
export async function requireAuth(req, _res, next) {
  const header = req.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw new HttpError(401, 'Sign in required')

  const { data, error } = await db.auth.getUser(token)
  if (error || !data?.user) throw new HttpError(401, 'Session expired, please sign in again')

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id, full_name, role, department_id, departments(name)')
    .eq('id', data.user.id)
    .maybeSingle()
  if (profileError) throw new HttpError(500, 'Could not load profile')
  if (!profile) throw new HttpError(403, 'No profile found for this account')

  req.user = {
    id: profile.id,
    email: data.user.email,
    fullName: profile.full_name,
    // The database stores students as 'user' and department staff as 'admin'.
    role: profile.role === 'admin' ? 'staff' : 'reporter',
    departmentId: profile.department_id,
    departmentName: profile.departments?.name ?? null,
  }
  next()
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (req.user?.role !== role) {
      throw new HttpError(403, role === 'staff' ? 'Staff access only' : 'Student reporters only')
    }
    next()
  }
}
