const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function formatDateTime(value) {
  return value ? dateTime.format(new Date(value)) : ''
}

export function relativeTime(value) {
  if (!value) return ''
  const diffMs = new Date(value).getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const minutes = Math.round(diffMs / 60000)
  if (abs < 3600000) return rtf.format(minutes, 'minute')
  const hours = Math.round(diffMs / 3600000)
  if (abs < 86400000 * 2) return rtf.format(hours, 'hour')
  return rtf.format(Math.round(diffMs / 86400000), 'day')
}

export function location(issue) {
  return issue.room ? `${issue.building}, ${issue.room}` : issue.building
}
