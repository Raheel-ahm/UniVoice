import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useManager } from '../../context/ManagerContext.jsx'
import { location } from '../../lib/format.js'
import { PriorityBadge, StatusBadge } from '../../components/Badges.jsx'
import {
  IconArrowRight,
  IconCheckCircle,
  IconEmergency,
  IconUsers,
  IconWrench,
} from '../../components/Icons.jsx'

export default function ManagerTeam() {
  const { departmentName, issues, technicians, assignTechnician } = useManager()
  const [dispatchModalTech, setDispatchModalTech] = useState(null)
  const [selectedIssueId, setSelectedIssueId] = useState('')
  const [dispatchNote, setDispatchNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [dispatchedMessage, setDispatchedMessage] = useState(null)

  // Unassigned open/in_progress issues eligible for assignment
  const unassignedIssues = useMemo(() => {
    return issues.filter((i) => !i.assigned_technician && (i.status === 'open' || i.status === 'in_progress'))
  }, [issues])

  function handleOpenDispatch(tech) {
    setDispatchModalTech(tech)
    setSelectedIssueId(unassignedIssues[0]?.id || '')
    setDispatchNote('')
  }

  async function handleConfirmDispatch() {
    if (!dispatchModalTech || !selectedIssueId) return
    setBusy(true)
    try {
      const targetIssue = issues.find((i) => i.id === selectedIssueId)
      await assignTechnician(selectedIssueId, dispatchModalTech.id, dispatchModalTech.name, dispatchNote.trim())
      setDispatchedMessage(`Dispatched "${targetIssue?.title || 'Task'}" to ${dispatchModalTech.name}`)
      setTimeout(() => setDispatchedMessage(null), 4000)
      setDispatchModalTech(null)
      setSelectedIssueId('')
      setDispatchNote('')
    } catch (err) {
      alert(`Assignment failed: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-container manager-page">
      <div className="page-head-card">
        <div>
          <span className="page-eyebrow">Staff Operations</span>
          <h1>{departmentName} Field Technicians & Duty Roster</h1>
          <p className="muted">
            Manage technical team assignments, inspect active tasks per technician, and dispatch incoming campus work orders.
          </p>
        </div>
        <div className="head-stats-pills">
          <span className="pill-metric">
            <strong>{technicians.filter((t) => t.status === 'online').length}</strong> Active On Shift
          </span>
          <span className="pill-metric info">
            <strong>{technicians.length}</strong> Total Technicians
          </span>
          <span className="pill-metric warning">
            <strong>{unassignedIssues.length}</strong> Unassigned Tasks
          </span>
        </div>
      </div>

      {dispatchedMessage && (
        <div className="alert alert-info">
          <IconCheckCircle />
          <strong>Assignment Confirmed:</strong> {dispatchedMessage}
        </div>
      )}

      {/* Technicians Grid */}
      <div className="technician-grid">
        {technicians.map((tech) => {
          const assignedToTech = issues.filter((i) => i.assigned_technician_id === tech.id)
          const activeJobs = assignedToTech.filter((i) => i.status === 'open' || i.status === 'in_progress')
          const completedJobs = assignedToTech.filter((i) => i.status === 'resolved' || i.status === 'closed')

          return (
            <div key={tech.id} className="technician-card">
              <div className="tech-header">
                <div className="tech-avatar-circle">
                  {tech.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="tech-info">
                  <h3>{tech.name}</h3>
                  <span className="tech-role">{tech.role}</span>
                </div>
                <span className={`tech-status-pill ${tech.status}`}>
                  {tech.status === 'online' ? '● On Shift' : tech.status === 'busy' ? '● Working Job' : '● On Call'}
                </span>
              </div>

              <div className="tech-details-box">
                <div className="tech-detail-row">
                  <span className="detail-key">Assigned Zone</span>
                  <span className="detail-val">📍 {tech.zone}</span>
                </div>
                <div className="tech-detail-row">
                  <span className="detail-key">Radio / Extension</span>
                  <span className="detail-val">📻 {tech.radio}</span>
                </div>
                <div className="tech-detail-row">
                  <span className="detail-key">Active Work Orders</span>
                  <span className="detail-val font-bold text-primary">
                    {activeJobs.length} active
                  </span>
                </div>
                <div className="tech-detail-row">
                  <span className="detail-key">Resolved / Closed</span>
                  <span className="detail-val text-ok">
                    <IconCheckCircle /> {completedJobs.length} resolved
                  </span>
                </div>
              </div>

              {/* Real Assigned Tasks List */}
              <div className="tech-active-tasks-list">
                <div className="tasks-list-head">
                  <span className="tasks-list-title">Assigned Campus Tasks ({activeJobs.length}):</span>
                </div>
                {activeJobs.length === 0 ? (
                  <div className="no-active-tasks-hint">
                    No active tasks currently assigned. Available for dispatch.
                  </div>
                ) : (
                  <ul className="tech-tasks-items">
                    {activeJobs.slice(0, 3).map((job) => (
                      <li key={job.id} className="tech-task-item">
                        <Link to={`/issues/${job.id}`} className="tech-task-link">
                          <span className="task-item-title">{job.title}</span>
                        </Link>
                        <div className="task-item-sub">
                          <span>📍 {location(job)}</span>
                          <PriorityBadge priority={job.priority} />
                        </div>
                      </li>
                    ))}
                    {activeJobs.length > 3 && (
                      <li className="more-tasks-note">
                        +{activeJobs.length - 3} more assigned tasks
                      </li>
                    )}
                  </ul>
                )}
              </div>

              <div className="tech-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-primary btn-block"
                  onClick={() => handleOpenDispatch(tech)}
                >
                  <IconWrench /> Assign Task to {tech.name.split(' ')[0]}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dispatch Modal */}
      {dispatchModalTech && (
        <div className="modal-overlay">
          <div className="modal-dialog-card assign-tech-dialog">
            <div className="modal-header">
              <div className="modal-title-with-icon">
                <IconWrench />
                <div>
                  <h3>Assign Task to {dispatchModalTech.name}</h3>
                  <span className="modal-subtitle">{dispatchModalTech.role} · {dispatchModalTech.zone}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setDispatchModalTech(null)}
              >
                ✕
              </button>
            </div>

            <div className="assign-modal-body">
              {unassignedIssues.length === 0 ? (
                <div className="alert alert-info">
                  All active campus issues are currently assigned to technical personnel!
                </div>
              ) : (
                <>
                  <label className="field">
                    <span className="field-label">Select Unassigned Problem Ticket</span>
                    <select
                      className="styled-select"
                      value={selectedIssueId}
                      onChange={(e) => setSelectedIssueId(e.target.value)}
                    >
                      {unassignedIssues.map((issue) => (
                        <option key={issue.id} value={issue.id}>
                          [{issue.priority.toUpperCase()}] {issue.title} — {location(issue)} ({issue.category_name})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span className="field-label">Dispatch Handover Note (Optional)</span>
                    <textarea
                      className="styled-textarea"
                      rows={3}
                      value={dispatchNote}
                      onChange={(e) => setDispatchNote(e.target.value)}
                      placeholder="e.g. Bring multimeter and circuit breaker replacement parts..."
                    />
                  </label>
                </>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDispatchModalTech(null)}
              >
                Cancel
              </button>
              {unassignedIssues.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!selectedIssueId || busy}
                  onClick={handleConfirmDispatch}
                >
                  {busy ? <span className="spinner-sm" /> : <><IconWrench /> Confirm Task Assignment</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Emergency On-Call Policy */}
      <div className="card notice-card mt-lg">
        <div className="notice-card-header">
          <h4>After-Hours Emergency On-Call Protocol</h4>
          <span className="badge-pill">24/7 Standby</span>
        </div>
        <p className="small muted">
          Between 6:00 PM and 7:00 AM, high-priority electrical or plumbing breaches automatically route through the
          Campus Security Control Room to the on-call supervisor.
        </p>
        <div className="emergency-call-bar mt-md">
          <IconEmergency />
          <span>Need immediate after-hours crew mobilization? Contact Security Dispatch: <strong>(555) 0199</strong></span>
        </div>
      </div>
    </div>
  )
}
