import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { NEXT_STATUSES, PRIORITY_LABELS, STATUS_LABELS } from '../lib/constants.js'
import { formatDateTime, location, relativeTime } from '../lib/format.js'
import { OverdueBadge, PriorityBadge, StatusBadge } from '../components/Badges.jsx'
import { useAuth } from '../context/AuthContext.jsx'

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

  if (error) return <p className="alert alert-error">{error}</p>
  if (!data) return <p className="muted">Loading…</p>

  const { issue, history } = data

  return (
    <div className="page">
      <Link to={isStaff ? '/staff' : '/my-reports'} className="back-link">
        ← {isStaff ? 'Dashboard' : 'My reports'}
      </Link>

      <div className="detail-grid">
        <section className="card">
          <div className="detail-badges">
            <StatusBadge status={issue.status} />
            <PriorityBadge priority={issue.priority} />
            {issue.is_overdue && <OverdueBadge />}
          </div>
          <h1 className="detail-title">{issue.title}</h1>
          <p className="muted">{location(issue)}</p>
          <p className="detail-desc">{issue.description}</p>

          {issue.image_url && (
            <a href={issue.image_url} target="_blank" rel="noreferrer">
              <img src={issue.image_url} alt="Photo of the reported problem" className="detail-image" />
            </a>
          )}

          <dl className="facts">
            <div><dt>Category</dt><dd>{issue.category_name}</dd></div>
            <div><dt>Department</dt><dd>{issue.department_name}</dd></div>
            <div><dt>Reported</dt><dd>{formatDateTime(issue.created_at)}</dd></div>
            <div><dt>People affected</dt><dd>{issue.reporter_count}</dd></div>
            {issue.status !== 'closed' && issue.status !== 'resolved' && (
              <div>
                <dt>Target</dt>
                <dd className={issue.is_overdue ? 'text-danger' : ''}>
                  {formatDateTime(issue.due_at)} ({relativeTime(issue.due_at)})
                </dd>
              </div>
            )}
            {issue.resolved_at && <div><dt>Resolved</dt><dd>{formatDateTime(issue.resolved_at)}</dd></div>}
            {isStaff && (
              <div>
                <dt>AI triage</dt>
                <dd>{issue.ai_used ? <AiSummary issue={issue} /> : 'Not used (entered manually)'}</dd>
              </div>
            )}
          </dl>

          {isStaff && data.reporter_notes?.length > 0 && (
            <div className="notes">
              <h3>Notes from reporters</h3>
              <p className="small muted">Reporter identities are kept private.</p>
              <ul>
                {data.reporter_notes.map((n, i) => (
                  <li key={i}>
                    <p>{n.note}</p>
                    <span className="small muted">{formatDateTime(n.joined_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isStaff && data.my_link && (
            <p className="small muted">
              {data.my_link.is_original ? 'You reported this issue' : 'You joined this report'} on{' '}
              {formatDateTime(data.my_link.joined_at)}.
            </p>
          )}
        </section>

        <aside className="stack">
          {/* Keyed by status so the form resets after each change. */}
          {isStaff && <StatusControls key={issue.status} issue={issue} onChanged={load} />}

          <section className="card">
            <h2>Progress</h2>
            <ol className="timeline">
              <li>
                <span className="timeline-status">Reported</span>
                <span className="small muted">{formatDateTime(issue.created_at)}</span>
              </li>
              {history.map((h) => (
                <li key={h.id}>
                  <span className="timeline-status">
                    {STATUS_LABELS[h.old_status] ?? '—'} → {STATUS_LABELS[h.new_status]}
                  </span>
                  <span className="small muted">
                    {formatDateTime(h.changed_at)} · {h.changed_by}
                  </span>
                  {h.note && <p className="timeline-note">{h.note}</p>}
                </li>
              ))}
            </ol>
          </section>
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
  return changed.length ? `Used; student changed ${changed.join(', ')}` : 'Used; student kept the suggestion'
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
      <section className="card">
        <h2>Status</h2>
        <p className="muted">This issue is closed. No further changes.</p>
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
    <section className="card">
      <h2>Update status</h2>
      <form className="form" onSubmit={submit}>
        <div className="segmented vertical">
          {options.map((o) => (
            <label key={o.status} className={target === o.status ? 'selected' : ''}>
              <input type="radio" name="next" value={o.status} checked={target === o.status} onChange={() => setTarget(o.status)} />
              {o.label} <span className="muted">→ {STATUS_LABELS[o.status]}</span>
            </label>
          ))}
        </div>
        <label className="field">
          <span>Note {selected?.noteRequired ? '(required)' : '(optional, visible to reporters)'}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} required={selected?.noteRequired} />
        </label>
        {error && <p className="alert alert-error">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !target}>
          {busy ? 'Saving…' : selected?.label ?? 'Update'}
        </button>
      </form>
    </section>
  )
}
