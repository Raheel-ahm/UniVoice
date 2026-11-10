import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { NEXT_STATUSES, PRIORITY_LABELS, STATUS_LABELS } from '../lib/constants.js'
import { formatDateTime, location, relativeTime } from '../lib/format.js'
import { OverdueBadge, PriorityBadge, StatusBadge } from '../components/Badges.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  IconCheckCircle,
  IconClock,
  IconEmergency,
  IconShield,
  IconSparkles,
  IconUsers,
} from '../components/Icons.jsx'

export default function IssueDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const isStaff = user.role === 'staff'

  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    return api.get(`/issues/${id}`).then(setData).catch((err) => setError(err.message))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (error) return <div className="alert alert-error">{error}</div>
  if (!data) return <div className="center-screen muted">Loading issue details…</div>

  const { issue, history } = data

  return (
    <div className="page-container">
      <Link to={isStaff ? '/staff' : '/my-reports'} className="back-nav-btn">
        ← Back to {isStaff ? 'Department Dashboard' : 'My Reports'}
      </Link>

      <div className="detail-layout-grid">
        {/* Main Details Column */}
        <section className="card modern-detail-card">
          <div className="detail-badges-row">
            <StatusBadge status={issue.status} />
            <PriorityBadge priority={issue.priority} />
            {issue.is_overdue && <OverdueBadge />}
          </div>

          <h1 className="detail-main-title">{issue.title}</h1>
          <div className="detail-location-pill">
            <span>📍 {location(issue)}</span>
          </div>

          <div className="detail-description-box">
            <p className="detail-desc-text">{issue.description}</p>
          </div>

          {issue.image_url && (
            <div className="detail-photo-container">
              <span className="photo-label">Attached Photo:</span>
              <a href={issue.image_url} target="_blank" rel="noreferrer" className="photo-link-wrapper">
                <img src={issue.image_url} alt="Problem on campus" className="detail-main-image" />
                <span className="zoom-hint">Click photo to expand ↗</span>
              </a>
            </div>
          )}

          {/* Facts Grid */}
          <div className="facts-grid">
            <div className="fact-item">
              <span className="fact-label">Category</span>
              <span className="fact-value">{issue.category_name}</span>
            </div>
            <div className="fact-item">
              <span className="fact-label">Assigned Department</span>
              <span className="fact-value">{issue.department_name}</span>
            </div>
            <div className="fact-item">
              <span className="fact-label">First Reported</span>
              <span className="fact-value">{formatDateTime(issue.created_at)}</span>
            </div>
            <div className="fact-item">
              <span className="fact-label">Students Affected</span>
              <span className="fact-value">
                <IconUsers /> {issue.reporter_count} {issue.reporter_count === 1 ? 'student' : 'students'}
              </span>
            </div>
            {issue.status !== 'closed' && issue.status !== 'resolved' && (
              <div className="fact-item">
                <span className="fact-label">Resolution SLA Target</span>
                <span className={`fact-value ${issue.is_overdue ? 'text-danger font-bold' : ''}`}>
                  <IconClock /> {formatDateTime(issue.due_at)} ({relativeTime(issue.due_at)})
                </span>
              </div>
            )}
            {issue.resolved_at && (
              <div className="fact-item">
                <span className="fact-label">Marked Resolved</span>
                <span className="fact-value text-ok">
                  <IconCheckCircle /> {formatDateTime(issue.resolved_at)}
                </span>
              </div>
            )}
            {isStaff && (
              <>
                <div className="fact-item full-width">
                  <span className="fact-label">Field Technician Assignment</span>
                  <span className="fact-value">
                    {issue.assigned_technician ? (
                      <span className="assigned-tech-pill font-bold">
                        👷 {issue.assigned_technician}{' '}
                        {issue.assigned_at && <span className="muted font-normal">· Assigned {formatDateTime(issue.assigned_at)}</span>}
                      </span>
                    ) : (
                      <span className="unassigned-tech-pill">⏳ Unassigned (Pending Manager Dispatch)</span>
                    )}
                  </span>
                </div>

                <div className="fact-item full-width">
                  <span className="fact-label">AI Triage Audit</span>
                  <span className="fact-value">
                    {issue.ai_used ? (
                      <AiSummary issue={issue} />
                    ) : (
                      <span className="muted">Not used (manual student submission)</span>
                    )}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Anonymized Reporter Notes for Staff */}
          {isStaff && data.reporter_notes?.length > 0 && (
            <div className="reporter-notes-section">
              <div className="notes-header">
                <IconUsers />
                <div>
                  <h3>Notes from Affected Students</h3>
                  <p className="small muted">Student identities are cryptographically private and anonymous.</p>
                </div>
              </div>
              <ul className="notes-list">
                {data.reporter_notes.map((n, i) => (
                  <li key={i} className="note-bubble">
                    <p className="note-text">{n.note}</p>
                    <span className="note-date">Submitted {formatDateTime(n.joined_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isStaff && data.my_link && (
            <div className="my-link-notice">
              {data.my_link.is_original
                ? '⭐ You are the original reporter of this issue.'
                : '🤝 You joined this report as an affected student.'}{' '}
              Recorded on {formatDateTime(data.my_link.joined_at)}.
            </div>
          )}
        </section>

        {/* Right Action & Timeline Column */}
        <aside className="detail-sidebar-column">
          {/* Staff Technician Assignment Widget */}
          {isStaff && <AssignTechnicianWidget key={issue.assigned_technician_id || 'unassigned'} issue={issue} onChanged={load} />}

          {/* Staff Status Transition Controls */}
          {isStaff && <StatusControls key={issue.status} issue={issue} onChanged={load} />}

          {/* Progress Timeline */}
          <section className="card modern-detail-card">
            <h3>Lifecycle Timeline</h3>
            <ol className="timeline-modern">
              <li className="timeline-step">
                <div className="timeline-marker completed" />
                <div className="timeline-info">
                  <span className="timeline-title">Issue Reported</span>
                  <span className="small muted">{formatDateTime(issue.created_at)}</span>
                </div>
              </li>
              {history.map((h) => (
                <li key={h.id} className="timeline-step">
                  <div className="timeline-marker in-progress" />
                  <div className="timeline-info">
                    <span className="timeline-title">
                      {STATUS_LABELS[h.old_status] ?? '—'} → {STATUS_LABELS[h.new_status]}
                    </span>
                    <span className="small muted">
                      {formatDateTime(h.changed_at)} · {h.changed_by}
                    </span>
                    {h.note && <div className="timeline-note-box">{h.note}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Emergency Escalation Quick Link */}
          <div className="card emergency-mini-card">
            <div className="emergency-mini-header">
              <IconEmergency />
              <div>
                <strong>Need immediate safety backup?</strong>
                <p>Call campus security dispatch</p>
              </div>
            </div>
            <Link to="/emergency" className="btn btn-sm btn-ghost">
              Security Protocol →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}

function AiSummary({ issue }) {
  const changed = []
  if (issue.ai_category_id !== issue.category_id) changed.push('category')
  if (issue.ai_department_id !== issue.department_id) changed.push('department')
  if (issue.ai_priority !== issue.priority) changed.push(`priority (AI said ${PRIORITY_LABELS[issue.ai_priority]})`)
  return (
    <span className="ai-summary-pill">
      <IconSparkles />
      {changed.length ? `AI applied; modified ${changed.join(', ')}` : 'AI suggestions verified & accepted'}
    </span>
  )
}

function StatusControls({ issue, onChanged }) {
  const options = NEXT_STATUSES[issue.status] ?? []
  const [target, setTarget] = useState(options[0]?.status ?? '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const selected = options.find((o) => o.status === target)

  if (options.length === 0) {
    return (
      <section className="card modern-detail-card">
        <h3>Status Management</h3>
        <div className="status-closed-message">
          <IconCheckCircle />
          <p>This issue is marked <strong>Closed</strong>. The fixed workflow is finished.</p>
        </div>
      </section>
    )
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.patch(`/staff/issues/${issue.id}/status`, { status: target, note })
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card modern-detail-card">
      <div className="staff-control-header">
        <IconShield />
        <h3>Update Workflow Status</h3>
      </div>
      <p className="small muted">Change status in accordance with department maintenance policy.</p>

      <form className="form mt-md" onSubmit={submit}>
        <div className="workflow-radio-group">
          {options.map((o) => (
            <label
              key={o.status}
              className={`workflow-radio-pill ${target === o.status ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="next"
                value={o.status}
                checked={target === o.status}
                onChange={() => setTarget(o.status)}
              />
              <div className="radio-text">
                <span className="radio-label">{o.label}</span>
                <span className="radio-target">Target: {STATUS_LABELS[o.status]}</span>
              </div>
            </label>
          ))}
        </div>

        <label className="field mt-md">
          <span className="field-label">
            Staff Note {selected?.noteRequired ? <span className="text-danger">* (Required)</span> : '(Optional for reporters)'}
          </span>
          <textarea
            className="styled-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={1000}
            required={selected?.noteRequired}
            placeholder={
              selected?.noteRequired
                ? 'Explain why this issue is being closed without repair or reopened...'
                : 'Add a status note for the student to read...'
            }
          />
        </label>

        {error && <div className="alert alert-error">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary btn-block mt-md"
          disabled={busy || !target}
        >
          {busy ? 'Updating Status…' : `Confirm: ${selected?.label ?? 'Update'}`}
        </button>
      </form>
    </section>
  )
}

function AssignTechnicianWidget({ issue, onChanged }) {
  const [techs, setTechs] = useState([])
  const [selectedTechId, setSelectedTechId] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    api
      .get('/staff/technicians')
      .then((res) => {
        if (res.technicians) {
          setTechs(res.technicians)
          setSelectedTechId(issue.assigned_technician_id || res.technicians[0]?.id || '')
        }
      })
      .catch(() => {})
  }, [issue])

  async function handleAssign(e) {
    e.preventDefault()
    if (!selectedTechId) return
    const chosen = techs.find((t) => t.id === selectedTechId) || { id: selectedTechId, name: 'Technician' }
    setBusy(true)
    try {
      await api.patch(`/staff/issues/${issue.id}/assign`, {
        technician_id: chosen.id,
        technician_name: chosen.name,
        note,
      })
      setMsg(`Successfully assigned task to ${chosen.name}!`)
      setTimeout(() => setMsg(null), 4000)
      await onChanged()
    } catch (err) {
      alert(`Assignment failed: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card modern-detail-card assign-tech-widget">
      <div className="staff-control-header">
        <IconWrench />
        <h3>Technical Team Dispatch</h3>
      </div>
      <p className="small muted">
        {issue.assigned_technician
          ? `Currently assigned to ${issue.assigned_technician}.`
          : 'Assign a field technician from the technical team to resolve this issue.'}
      </p>

      {msg && <div className="alert alert-info mt-sm">{msg}</div>}

      <form onSubmit={handleAssign} className="mt-sm">
        <label className="field">
          <span className="field-label">Field Technician</span>
          <select
            className="styled-select"
            value={selectedTechId}
            onChange={(e) => setSelectedTechId(e.target.value)}
            required
          >
            {techs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.role} ({t.activeJobs} active jobs)
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Handover Note (Optional)</span>
          <input
            className="styled-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Bring safety ladder, check breaker..."
          />
        </label>

        <button type="submit" className="btn btn-primary btn-block mt-sm" disabled={busy || !selectedTechId}>
          {busy ? (
            <span className="spinner-sm" />
          ) : (
            <>
              <IconWrench /> {issue.assigned_technician ? 'Reassign Technician' : 'Dispatch Technician'}
            </>
          )}
        </button>
      </form>
    </section>
  )
}
