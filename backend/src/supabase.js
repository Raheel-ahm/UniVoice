import { createClient } from '@supabase/supabase-js'
import { config } from './config.js'

// Service-role client. It bypasses RLS, so every route must check the caller's
// identity and role before using it (see middleware/auth.js).
export const db = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
