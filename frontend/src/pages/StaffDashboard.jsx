import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { formatDateTime, location, relativeTime } from '../lib/format.js'
import { OverdueBadge, PriorityBadge, StatusBadge } from '../components/Badges.jsx'
import {
  IconArrowRight,
  IconCheckCircle,
  IconClock,
  IconEmergency,
  IconSearch,
  IconShield,
  IconSparkles,
  IconUsers,
} from '../components/Icons.jsx'

const FILTERS = [
  { key: 'active', label: 'Active Issues', test: (i) => i.status === 'open' || i.status === 'in_progress' },
  { key: 'overdue', label: 'Overdue (Escalated)', test: (i) => i.is_overdue },
  { key: 'open', label: 'Open', test: (i) => i.status === 'open' },
  { key: 'in_progress', label: 'In Progress', test: (i) => i.status === 'in_progress' },
  { key: 'resolved', label: 'Resolved', test: (i) => i.status === 'resolved' },
  { key: 'closed', label: 'Closed', test: (i) => i.status === 'closed' },
  { key: 'all', label: 'All Issues', test: () => true },
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

  // Auto-refresh regularly so issues that pass their due SLA time show as escalated
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

  if (error && !data) return <div className="alert alert-error">{error}</div>
  if (!data) return <div className="center-screen muted">Loading department dashboard…</div>

  const { summary } = data
  const departmentName = data.department || 'Department'

  return (
    <div className="dashboard-container staff-mode">
      {/* Manager / Staff Hero Banner */}
      <div className="hero-banner staff-hero">
        <div className="hero-content">
          <div className="staff-role-badge">
            <IconShield /> Department Operations Hub
          </div>
          <h1 className="hero-title">{departmentName} Manager Dashboard</h1>
          <p className="hero-subtitle">
            Manage assigned issues through the fixed status workflow (Open → In Progress → Resolved).
            Overdue tickets are automatically prioritized and escalated.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-hero" onClick={load}>
              Refresh Data
            </button>
            <Link to="/emergency" className="btn btn-hero-ghost">
              <IconEmergency /> Security Dispatch
            </Link>
          </div>
        </div>
        <div className="hero-illustration staff-hero-deco" aria-hidden="true">
          <div className="staff-metric-bubble">
            <span className="metric-bubble-title">Department SLA</span>
            <span className="metric-bubble-stat">
              {summary.total ? Math.round(((summary.total - summary.overdue) / summary.total) * 100) : 100}%
            </span>
            <span className="metric-bubble-sub">Compliance rate</span>
          </div>
        </div>
      </div>

      {/* Finanace-like Stat cards row */}
      <div className="section-header">
        <h2>Department Performance & Workload</h2>
        <span className="live-indicator">
          <span className="pulse-dot" /> Live Monitoring (Auto-sync 60s)
        </span>
      </div>

      <div className="stats-cards-grid staff-stats">
        <button
          type="button"
          className={`stat-card ${summary.overdue > 0 ? 'overdue-alert-card' : ''} ${filter === 'overdue' ? 'active-stat-card' : ''}`}
          onClick={() => setFilter('overdue')}
        >
          <div className="stat-card-graphic">
            <div className={`graphic-icon ${summary.overdue > 0 ? 'bg-danger' : 'bg-violet'}`}>
              <IconClock />
            </div>
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value text-danger-val">{summary.overdue}</span>
            <span className="stat-card-label">Overdue (Escalated)</span>
          </div>
        </button>

        <button
          type="button"
          className={`stat-card ${filter === 'open' ? 'active-stat-card' : ''}`}
          onClick={() => setFilter('open')}
        >
          <div className="stat-card-graphic">
            <div className="graphic-icon bg-violet">
              <IconSparkles />
            </div>
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{summary.open}</span>
            <span className="stat-card-label">Open / New</span>
          </div>
        </button>

        <button
          type="button"
          className={`stat-card ${filter === 'in_progress' ? 'active-stat-card' : ''}`}
          onClick={() => setFilter('in_progress')}
        >
          <div className="stat-card-graphic">
            <div className="graphic-icon bg-indigo">
              <IconClock />
            </div>
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{summary.in_progress}</span>
            <span className="stat-card-label">In Progress</span>
          </div>
        </button>

        <button
          type="button"
          className={`stat-card ${filter === 'resolved' ? 'active-stat-card' : ''}`}
          onClick={() => setFilter('resolved')}
        >
          <div className="stat-card-graphic">
            <div className="graphic-icon bg-emerald">
              <IconCheckCircle />
            </div>
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{summary.resolved}</span>
            <span className="stat-card-label">Resolved</span>
          </div>
        </button>
      </div>

      {summary.overdue > 0 && (
        <div className="alert-escalation-banner">
          <div className="escalation-icon">
            <IconEmergency />
          </div>
          <div className="escalation-content">
            <strong>
              {summary.overdue} {summary.overdue === 1 ? 'issue has' : 'issues have'} exceeded resolution target time!
            </strong>
            <p>
              These tickets are escalated to top priority in accordance with campus SLA rules. Immediate staff dispatch required.
            </p>
          </div>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setFilter('overdue')}>
            View Escalations
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="dashboard-columns">
        <div className="main-content-column">
          {/* Toolbar with chips and search */}
          <div className="filter-toolbar-card">
            <div className="chips-wrapper" role="tablist">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.key}
                  className={`filter-chip ${filter === f.key ? 'active' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="search-input-box">
              <IconSearch className="search-icon-inside" />
              <input
                type="search"
                className="dashboard-search-field"
                placeholder="Search title, building, room…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Issues List */}
          <div className="section-header mt-md">
            <h2>
              {FILTERS.find((f) => f.key === filter)?.label} ({visible.length})
            </h2>
          </div>

          {visible.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon-wrap">
                <IconCheckCircle />
              </div>
              <h3>No issues match this filter</h3>
              <p>Everything in this queue is clear. Switch filters above to inspect other tickets.</p>
            </div>
          ) : (
            <ul className="issue-list">
              {visible.map((issue) => (
                <li key={issue.id}>
                  <Link
                    to={`/issues/${issue.id}`}
                    className={`issue-row ${issue.is_overdue ? 'is-overdue' : ''}`}
                  >
                    <div className="issue-row-main">
                      <div className="issue-title-line">
                        <strong>{issue.title}</strong>
                        {issue.has_image && <span className="photo-indicator">📷 Photo</span>}
                      </div>
                      <span className="small muted">
                        {location(issue)} · {issue.category_name}
                        {issue.reporter_count > 1 && ` · ${issue.reporter_count} students affected`}
                      </span>
                      <span className={`small ${issue.is_overdue ? 'text-danger overdue-text' : 'muted'}`}>
                        {issue.status === 'open' || issue.status === 'in_progress'
                          ? `Target: ${relativeTime(issue.due_at)}`
                          : `Updated: ${formatDateTime(issue.updated_at)}`}
                      </span>
                    </div>
                    <div className="issue-row-badges">
                      {issue.is_overdue && <OverdueBadge />}
                      <StatusBadge status={issue.status} />
                      <PriorityBadge priority={issue.priority} />
                      <span className="view-link-pill">
                        Manage <IconArrowRight />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Manager Side Widgets */}
        <div className="sidebar-column">
          {/* SLA Rules Policy Card */}
          <div className="notice-card">
            <div className="notice-card-header">
              <h4>Target SLA Protocols</h4>
              <span className="badge-pill">Server Enforced</span>
            </div>
            <ul className="sla-rules-list">
              <li className="sla-item high">
                <span className="sla-dot danger" />
                <div className="sla-info">
                  <strong>High Priority</strong>
                  <p>Critical repairs · Must resolve within 24 hours</p>
                </div>
                <span className="sla-timer-badge">24h SLA</span>
              </li>
              <li className="sla-item medium">
                <span className="sla-dot warning" />
                <div className="sla-info">
                  <strong>Medium Priority</strong>
                  <p>Classroom & equipment faults · Within 72 hours</p>
                </div>
                <span className="sla-timer-badge">72h SLA</span>
              </li>
              <li className="sla-item low">
                <span className="sla-dot normal" />
                <div className="sla-info">
                  <strong>Low Priority</strong>
                  <p>Aesthetic & minor wear · Within 7 days</p>
                </div>
                <span className="sla-timer-badge">7d SLA</span>
              </li>
            </ul>
          </div>

          {/* Workflow Guard Rules Card */}
          <div className="notice-card">
            <div className="notice-card-header">
              <h4>Fixed Workflow Rules</h4>
              <span className="badge-pill">DB Trigger</span>
            </div>
            <div className="workflow-flowchart">
              <div className="wf-node">Open</div>
              <div className="wf-arrow">↓</div>
              <div className="wf-node active">In Progress</div>
              <div className="wf-arrow">↓</div>
              <div className="wf-node success">Resolved</div>
              <div className="wf-arrow">↓</div>
              <div className="wf-node muted">Closed</div>
            </div>
            <p className="wf-note">
              Reopening or closing without fixing requires mandatory staff justification notes.
            </p>
          </div>

          {/* Reporter Privacy Shield Card */}
          <div className="notice-card privacy-card">
            <div className="privacy-header">
              <IconUsers />
              <h4>Student Privacy Guard</h4>
            </div>
            <p>
              UniVoice strictly shields student identities. Department staff see aggregated counts and anonymized notes,
              ensuring retaliatory protection.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
