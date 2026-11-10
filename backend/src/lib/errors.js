export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

const UV_STATUS = {
  UV_VALIDATION: 400,
  UV_FORBIDDEN: 403,
  UV_NOT_FOUND: 404,
  UV_CONFLICT: 409,
  UV_INVALID_TRANSITION: 409,
}

// Turns a Supabase/PostgREST error into an HttpError. Database rule
// violations are raised as "UV_CODE: message" by the SQL functions.
export function fromDbError(error) {
  const match = /^(UV_[A-Z_]+):\s*(.*)$/s.exec(error?.message ?? '')
  if (match) {
    return new HttpError(UV_STATUS[match[1]] ?? 400, match[2])
  }
  if (error?.code === '23514' || error?.code === '22P02') {
    return new HttpError(400, 'Invalid data')
  }
  console.error('Database error:', error)
  return new HttpError(500, 'Database error')
}

export function must({ data, error }) {
  if (error) throw fromDbError(error)
  return data
}
