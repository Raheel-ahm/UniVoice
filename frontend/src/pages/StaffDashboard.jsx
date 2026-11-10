import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { formatDateTime, location, relativeTime } from '../lib/format.js'
import { OverdueBadge, PriorityBadge, StatusBadge } from '../components/Badges.jsx'

const FILTERS = [
  { key: 'active', label: 'Active', test: (i) => i.status === 'open' || i.status === 'in_progress' },
  { key: 'overdue', label: 'Overdue', test: (i) => i.is_overdue },
  { key: 'open', label: 'Open', test: (i) => i.status === 'open' },
  { key: 'in_progress', label: 'In progress', test: (i) => i.status === 'in_progress' },
  { key: 'resolved', label: 'Resolved', test: (i) => i.status === 'resolved' },
  { key: 'closed', label: 'Closed', test: (i) => i.status === 'closed' },
  { key: 'all', label: 'All', test: () => true },
]

const REFRESH_MS = 60_000

export default function StaffDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('active')
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    api
      .get('/staff/issues')
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((err) => setError(err.message))
  }, [])

  // Refresh regularly so issues that pass their due time show as escalated
  // without a manual reload.
  useEffect(() => {
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  const visible = useMemo(() => {
    if (!data) return []
    const test = FILTERS.find((f) => f.key === filter).test
    const q = search.trim().toLowerCase()
    return data.issues.filter(
      (i) =>
        test(i) &&
        (!q || [i.title, i.building, i.room, i.category_name].some((v) => v?.toLowerCase().includes(q))),
    )
  }, [data, filter, search])

  if (error && !data) return <p className="alert alert-error">{error}</p>
  if (!data) return <p className="muted">Loading…</p>

  const { summary } = data

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{data.department} dashboard</h1>
          <p className="muted small">Overdue issues are escalated to the top. Refreshes every minute.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
      </div>

      {error && <p className="alert alert-warn">Could not refresh: {error}</p>}

      <div className="stats">
        <Stat label="Overdue" value={summary.overdue} tone={summary.overdue > 0 ? 'danger' : ''} onClick={() => setFilter('overdue')} />
        <Stat label="Open" value={summary.open} onClick={() => setFilter('open')} />
        <Stat label="In progress" value={summary.in_progress} onClick={() => setFilter('in_progress')} />
        <Stat label="Resolved" value={summary.resolved} onClick={() => setFilter('resolved')} />
      </div>

      {summary.overdue > 0 && (
        <div className="alert alert-error">
          <strong>{summary.overdue} overdue {summary.overdue === 1 ? 'issue needs' : 'issues need'} attention.</strong>{' '}
          They passed their target time without being resolved.
        </div>
      )}

      <div className="toolbar">
        <div className="chips" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={`chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="search"
          placeholder="Search title, building, room…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <div className="card center"><p className="muted">No issues here.</p></div>
      ) : (
        <ul className="issue-list">
          {visible.map((issue) => (
            <li key={issue.id}>
              <Link to={`/issues/${issue.id}`} className={`issue-row ${issue.is_overdue ? 'is-overdue' : ''}`}>
                <div className="issue-row-main">
                  <strong>{issue.title}</strong>
                  <span className="small muted">
                    {location(issue)} · {issue.category_name}
                    {issue.reporter_count > 1 && ` · ${issue.reporter_count} reporters`}
                    {issue.has_image && ' · photo'}
                  </span>
                  <span className={`small ${issue.is_overdue ? 'text-danger' : 'muted'}`}>
                    {issue.status === 'open' || issue.status === 'in_progress'
                      ? `Due ${relativeTime(issue.due_at)}`
                      : `Updated ${formatDateTime(issue.updated_at)}`}
                  </span>
                </div>
                <div className="issue-row-badges">
                  {issue.is_overdue && <OverdueBadge />}
                  <StatusBadge status={issue.status} />
                  <PriorityBadge priority={issue.priority} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Stat({ label, value, tone, onClick }) {
  return (
    <button type="button" className={`stat ${tone ? `stat-${tone}` : ''}`} onClick={onClick}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </button>
  )
}
