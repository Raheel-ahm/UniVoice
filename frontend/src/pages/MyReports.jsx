import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { formatDateTime, location } from '../lib/format.js'
import { PriorityBadge, StatusBadge } from '../components/Badges.jsx'

export default function MyReports() {
  const [issues, setIssues] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/issues/mine').then((r) => setIssues(r.issues)).catch((err) => setError(err.message))
  }, [])

  if (error) return <p className="alert alert-error">{error}</p>
  if (!issues) return <p className="muted">Loading…</p>

  return (
    <div className="page">
      <div className="page-head">
        <h1>My reports</h1>
        <Link to="/report" className="btn btn-primary">Report a problem</Link>
      </div>

      {issues.length === 0 ? (
        <div className="card center">
          <p>You haven't reported anything yet.</p>
        </div>
      ) : (
        <ul className="issue-list">
          {issues.map((issue) => (
            <li key={issue.id}>
              <Link to={`/issues/${issue.id}`} className="issue-row">
                <div className="issue-row-main">
                  <strong>{issue.title}</strong>
                  <span className="small muted">
                    {location(issue)} · {issue.category_name} · {issue.department_name}
                  </span>
                  <span className="small muted">
                    {issue.is_original ? 'Reported' : 'Joined'} {formatDateTime(issue.joined_at)}
                    {issue.reporter_count > 1 && ` · ${issue.reporter_count} people affected`}
                  </span>
                </div>
                <div className="issue-row-badges">
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
