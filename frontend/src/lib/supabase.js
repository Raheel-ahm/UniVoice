import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anonKey)

// Used only for sign-in. All data goes through the UniVoice API.
export const supabase = supabaseConfigured ? createClient(url, anonKey) : null
