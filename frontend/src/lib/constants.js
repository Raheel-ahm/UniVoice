export const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' }

// Mirrors the workflow enforced by the database (backend/db/02_rules.sql).
// noteRequired matches the server rule; the UI just asks for it up front.
export const NEXT_STATUSES = {
  open: [
    { status: 'in_progress', label: 'Start work' },
    { status: 'closed', label: 'Close without fixing', noteRequired: true },
  ],
  in_progress: [{ status: 'resolved', label: 'Mark resolved' }],
  resolved: [
    { status: 'closed', label: 'Close' },
    { status: 'in_progress', label: 'Reopen', noteRequired: true },
  ],
  closed: [],
}

