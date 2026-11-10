import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { formatDateTime, location, relativeTime } from '../lib/format.js'
import { PriorityBadge, StatusBadge } from '../components/Badges.jsx'
import { IconArrowRight, IconList, IconReport, IconSearch } from '../components/Icons.jsx'

export default function MyReports() {
  const [issues, setIssues] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api
      .get('/issues/mine')
      .then((r) => setIssues(r.issues))
      .catch((err) => setError(err.message))
  }, [])

  const filtered = useMemo(() => {
    if (!issues) return []
    const q = search.trim().toLowerCase()
    return issues.filter((i) => {
      if (filter === 'active' && !(i.status === 'open' || i.status === 'in_progress')) return false
      if (filter === 'resolved' && !(i.status === 'resolved' || i.status === 'closed')) return false
      if (
        q &&
        ![i.title, i.building, i.room, i.category_name, i.department_name].some((v) =>
          v?.toLowerCase().includes(q),
        )
      ) {
        return false
      }
      return true
    })
  }, [issues, filter, search])

  if (error) return <div className="alert alert-error">{error}</div>
  if (!issues) return <div className="center-screen muted">Loading your reports…</div>

  return (
    <div className="page-container">
      <div className="page-head-card">
        <div>
          <span className="page-eyebrow">Student Dashboard</span>
          <h1>My Campus Reports</h1>
          <p className="muted">
            Track resolution status, repair timelines, and SLA targets for your reported campus issues.
          </p>
        </div>
        <Link to="/report" className="btn btn-primary">
          <IconReport /> Report a Problem
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-toolbar-card">
        <div className="chips-wrapper" role="tablist">
          <button
            type="button"
            className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Reports ({issues.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active / In Progress ({issues.filter((i) => i.status === 'open' || i.status === 'in_progress').length})
          </button>
          <button
            type="button"
            className={`filter-chip ${filter === 'resolved' ? 'active' : ''}`}
            onClick={() => setFilter('resolved')}
          >
            Resolved ({issues.filter((i) => i.status === 'resolved' || i.status === 'closed').length})
          </button>
        </div>

        <div className="search-input-box">
          <IconSearch className="search-icon-inside" />
          <input
            type="search"
            className="dashboard-search-field"
            placeholder="Search my reports, locations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon-wrap">
            <IconList />
          </div>
          <h3>No reports found</h3>
          <p>
            {issues.length === 0
              ? "You haven't reported any campus problems yet."
              : 'No reports match your search or filter.'}
          </p>
          {issues.length === 0 && (
            <Link to="/report" className="btn btn-primary">
              Report Your First Problem
            </Link>
          )}
        </div>
      ) : (
        <ul className="issue-list">
          {filtered.map((issue) => (
            <li key={issue.id}>
              <Link to={`/issues/${issue.id}`} className="issue-row">
                <div className="issue-row-main">
                  <div className="issue-title-line">
                    <strong>{issue.title}</strong>
                    {issue.has_image && <span className="photo-indicator">📷 Photo</span>}
                  </div>
                  <span className="small muted">
                    {location(issue)} · {issue.category_name} · {issue.department_name}
                  </span>
                  <span className="small muted">
                    {issue.is_original ? 'Reported' : 'Joined'} {formatDateTime(issue.joined_at)}
                    {issue.reporter_count > 1 && ` · ${issue.reporter_count} students affected`}
                    {issue.status === 'open' || issue.status === 'in_progress' ? ` · Due ${relativeTime(issue.due_at)}` : ''}
                  </span>
                </div>
                <div className="issue-row-badges">
                  <StatusBadge status={issue.status} />
                  <PriorityBadge priority={issue.priority} />
                  <span className="view-link-pill">
                    View <IconArrowRight />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
