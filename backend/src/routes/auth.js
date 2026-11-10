import { Router } from 'express'
import { z } from 'zod'
import { db } from '../supabase.js'
import { HttpError } from '../lib/errors.js'
import { parse } from '../lib/validate.js'
import { rateLimit } from '../lib/rateLimit.js'

export const authRouter = Router()

const signupSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/, 'Password must contain at least one special character'),
})

// Creates an already-confirmed account so students can sign in straight away
// without an email confirmation step. New accounts are always reporters
// (the handle_new_user trigger sets the role).
authRouter.post(
  '/signup',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many sign-ups from this network. Please try again later.' }),
  async (req, res) => {
    const input = parse(signupSchema, req.body)
    const { error } = await db.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.full_name },
    })
    if (error) {
      if (error.status === 422 || /already/i.test(error.message)) {
        throw new HttpError(409, 'An account with this email already exists. Please sign in.')
      }
      console.error('Sign-up failed:', error)
      throw new HttpError(400, error.message)
    }
    res.status(201).json({ ok: true })
  },
)
