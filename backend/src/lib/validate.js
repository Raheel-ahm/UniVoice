import { z } from 'zod'
import { HttpError } from './errors.js'

export function parse(schema, input) {
  const result = schema.safeParse(input)
  if (!result.success) {
    const issue = result.error.issues[0]
    const field = issue.path.join('.')
    throw new HttpError(400, field ? `${field}: ${issue.message}` : issue.message)
  }
  return result.data
}

export const uuid = z.string().uuid('Invalid id')

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null))

export const issueText = {
  title: z.string().trim().min(3, 'must be at least 3 characters').max(150, 'must be at most 150 characters'),
  description: z.string().trim().min(10, 'must be at least 10 characters').max(2000, 'must be at most 2000 characters'),
  building: z.string().trim().min(1, 'is required').max(100),
  room: optionalText(50),
}

export const note = optionalText(1000)
export const priority = z.enum(['low', 'medium', 'high'])
export const status = z.enum(['open', 'in_progress', 'resolved', 'closed'])
export const id = z.coerce.number().int().positive()
