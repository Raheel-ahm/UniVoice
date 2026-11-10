import crypto from 'node:crypto'

function required(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required environment variable ${name}. Copy backend/.env.example to backend/.env and fill it in.`)
    process.exit(1)
  }
  return value
}

let suggestionSecret = process.env.SUGGESTION_SECRET
if (!suggestionSecret) {
  suggestionSecret = crypto.randomBytes(32).toString('hex')
  console.warn('SUGGESTION_SECRET is not set; using a random one. AI suggestion tokens will not survive a restart.')
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  frontendOrigin: (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173').split(',').map((s) => s.trim()),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-opus-5-5',
  suggestionSecret,
  imageBucket: 'issue-images',
  maxImageBytes: 5 * 1024 * 1024,
}
