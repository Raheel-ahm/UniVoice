import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { z } from 'zod'
import { config } from './config.js'
import { HttpError } from './lib/errors.js'
import { parse, issueText } from './lib/validate.js'
import { rateLimit } from './lib/rateLimit.js'
import { createSuggestionToken } from './lib/suggestionToken.js'
import { requireAuth, requireRole } from './middleware/auth.js'
import { getCatalog } from './services/catalog.js'
import { classifyIssue } from './services/classifier.js'
import { authRouter } from './routes/auth.js'
import { emergencyRouter } from './routes/emergency.js'
import { issuesRouter } from './routes/issues.js'
import { staffRouter } from './routes/staff.js'

const app = express()
app.disable('x-powered-by')
app.use(cors({ origin: config.frontendOrigin }))
app.use(express.json({ limit: '100kb' }))

// Public health and emergency screens/endpoints (no sign-in required)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: config.anthropicConfigured })
})

app.use('/emergency', emergencyRouter)
app.use('/api/emergency', emergencyRouter)

app.use('/api/auth', authRouter)

app.use('/api', requireAuth)

app.get('/api/me', (req, res) => {
  res.json({ user: req.user })
})

app.get('/api/meta', async (_req, res) => {
  res.json(await getCatalog())
})

app.post(
  '/api/ai/classify',
  requireRole('reporter'),
  rateLimit({ windowMs: 10 * 60 * 1000, max: 20, message: 'Too many AI requests. Please wait a few minutes or choose manually.' }),
  async (req, res) => {
    const input = parse(
      z.object({
        title: issueText.title,
        description: issueText.description,
        building: issueText.building.optional(),
        room: issueText.room,
      }),
      req.body,
    )
    const result = await classifyIssue(input)
    if (!result.available) return res.json(result)

    res.json({ ...result, token: createSuggestionToken(req.user.id, result.suggestion) })
  },
)

app.use('/api/issues', issuesRouter)
app.use('/api/staff', staffRouter)

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')))

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 5 MB or smaller' : err.message
    return res.status(400).json({ error: message })
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message })
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }
  console.error(err)
  res.status(500).json({ error: 'Something went wrong' })
})

app.listen(config.port, (error) => {
  if (error) {
    console.error(
      error.code === 'EADDRINUSE'
        ? `Port ${config.port} is already in use. Is the backend already running in another terminal?`
        : error,
    )
    process.exit(1)
  }
  console.log(`UniVoice API listening on http://localhost:${config.port}`)
  if (!config.anthropicConfigured) console.log('ANTHROPIC_API_KEY not set: AI suggestions disabled, manual entry only.')
})
