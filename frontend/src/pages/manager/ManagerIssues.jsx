import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useManager } from '../../context/ManagerContext.jsx'
import { api } from '../../lib/api.js'
import { formatDateTime, location, relativeTime } from '../../lib/format.js'
import { OverdueBadge, PriorityBadge, StatusBadge } from '../../components/Badges.jsx'
import {
  IconArrowRight,
  IconCheckCircle,
  IconClock,
  IconSearch,
  IconSparkles,
  IconUsers,
  IconWrench,
} from '../../components/Icons.jsx'

export default function ManagerIssues() {
  const { departmentName, issues, updateStatus, technicians, assignTechnician } = useManager()
  const [searchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [selectedDept, setSelectedDept] = useState('all')
  const [techFilter, setTechFilter] = useState('all') // 'all' | 'unassigned' | 'assigned' | techId
  const [departments, setDepartments] = useState([])
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [actionLoading, setActionLoading] = useState(null)
  const [quickNoteModal, setQuickNoteModal] = useState(null) // { issueId, nextStatus }
  const [noteInput, setNoteInput] = useState('')
  const [assignModal, setAssignModal] = useState(null) // { issue }
  const [selectedTechId, setSelectedTechId] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [feedbackToast, setFeedbackToast] = useState(null)

  const selectedTech = useMemo(() => {
    return technicians.find((t) => t.id === selectedTechId) || technicians[0] || null
  }, [technicians, selectedTechId])

  useEffect(() => {
    api.get('/meta').then((d) => setDepartments(d.departments || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const s = searchParams.get('status')
    if (s) setStatusFilter(s)
    const q = searchParams.get('q')
    if (q !== null) setSearch(q)
  }, [searchParams])

  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      if (selectedDept !== 'all' && i.department_id !== Number(selectedDept)) return false
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue' && !i.is_overdue) return false
        if (statusFilter === 'active' && !(i.status === 'open' || i.status === 'in_progress')) return false
        if (statusFilter !== 'overdue' && statusFilter !== 'active' && i.status !== statusFilter) return false
      }
      if (priorityFilter !== 'all' && i.priority !== priorityFilter) return false
      if (techFilter === 'unassigned' && i.assigned_technician) return false
      if (techFilter === 'assigned' && !i.assigned_technician) return false
      if (techFilter !== 'all' && techFilter !== 'unassigned' && techFilter !== 'assigned' && i.assigned_technician_id !== techFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const match = [
          i.title,
          i.building,
          i.room,
          i.category_name,
          i.department_name,
          i.description,
          i.assigned_technician,
        ].some((field) => field?.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })
  }, [issues, selectedDept, statusFilter, priorityFilter, techFilter, search])

  async function handleQuickStatus(issueId, nextStatus, requiresNote = false) {
    if (requiresNote) {
      setQuickNoteModal({ issueId, nextStatus })
      setNoteInput('')
      return
    }
    setActionLoading(issueId)
    try {
      await updateStatus(issueId, nextStatus)
    } finally {
      setActionLoading(null)
    }
  }

  async function confirmModalStatus() {
    if (!quickNoteModal) return
    if (!noteInput.trim() || noteInput.trim().length < 5) {
      alert('Please enter an explanatory note of at least 5 characters.')
      return
    }
    setActionLoading(quickNoteModal.issueId)
    try {
      await updateStatus(quickNoteModal.issueId, quickNoteModal.nextStatus, noteInput.trim())
      setQuickNoteModal(null)
      setNoteInput('')
    } finally {
      setActionLoading(null)
    }
  }

  function handleOpenAssignModal(issue) {
    setAssignModal({ issue })
    setSelectedTechId(issue.assigned_technician_id || technicians[0]?.id || 't-1')
    setAssignNote('')
  }

  async function confirmAssignment() {
    if (!assignModal || !selectedTechId) return
    const tech = technicians.find((t) => t.id === selectedTechId) || { id: selectedTechId, name: 'Technician' }
    setActionLoading(assignModal.issue.id)
    try {
      await assignTechnician(assignModal.issue.id, tech.id, tech.name, assignNote.trim())
      setFeedbackToast(`Assigned "${assignModal.issue.title}" to ${tech.name}`)
      setTimeout(() => setFeedbackToast(null), 4000)
      setAssignModal(null)
      setAssignNote('')
    } catch (err) {
      alert(`Assignment failed: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="page-container manager-page">
      <div className="page-head-card">
        <div>
          <span className="page-eyebrow">{departmentName} Department</span>
          <h1>Work Orders & Issue Triage</h1>
          <p className="muted">
            Track student complaints, dispatch technicians, and step tickets through the fixed campus status workflow.
          </p>
        </div>
        <div className="head-stats-pills">
          <span className="pill-metric">
            <strong>{issues.length}</strong> Total Complaints
          </span>
          <span className="pill-metric warning">
            <strong>{issues.filter((i) => i.is_overdue).length}</strong> Overdue Escalations
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar-card">
        <div className="chips-wrapper" role="tablist">
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({issues.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'overdue' ? 'active' : ''}`}
            onClick={() => setStatusFilter('overdue')}
          >
            🚨 Overdue ({issues.filter((i) => i.is_overdue).length})
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active ({issues.filter((i) => i.status === 'open' || i.status === 'in_progress').length})
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'open' ? 'active' : ''}`}
            onClick={() => setStatusFilter('open')}
          >
            Open ({issues.filter((i) => i.status === 'open').length})
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setStatusFilter('in_progress')}
          >
            In Progress ({issues.filter((i) => i.status === 'in_progress').length})
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === 'resolved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('resolved')}
          >
            Resolved ({issues.filter((i) => i.status === 'resolved').length})
          </button>
          <button
            type="button"
            className={`filter-chip ${priorityFilter === 'high' ? 'active' : ''}`}
            onClick={() => setPriorityFilter((prev) => (prev === 'high' ? 'all' : 'high'))}
          >
            ⚡ High Priority ({issues.filter((i) => i.priority === 'high').length})
          </button>
        </div>

        <div className="toolbar-controls-right">
          {departments.length > 0 && (
            <select
              className="dept-filter-select"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              title="Filter by Campus Department"
            >
              <option value="all">🏢 All Departments ({issues.length})</option>
              {departments.map((dept) => {
                const count = issues.filter((i) => i.department_id === dept.id).length
                return (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({count})
                  </option>
                )
              })}
            </select>
          )}

          <select
            className="tech-filter-select"
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            title="Filter by Technical Team Assignment"
          >
            <option value="all">👷 All Technical Assignments</option>
            <option value="unassigned">
              ⏳ Unassigned Only ({issues.filter((i) => !i.assigned_technician && (i.status === 'open' || i.status === 'in_progress')).length})
            </option>
            <option value="assigned">
              ✓ Assigned to Team ({issues.filter((i) => Boolean(i.assigned_technician)).length})
            </option>
            <optgroup label="Technical Team">
              {technicians.map((t) => {
                const count = issues.filter((i) => i.assigned_technician_id === t.id).length
                return (
                  <option key={t.id} value={t.id}>
                    {t.name} ({count})
                  </option>
                )
              })}
            </optgroup>
          </select>

          <div className="search-input-box">
            <IconSearch className="search-icon-inside" />
            <input
              type="search"
              className="dashboard-search-field"
              placeholder="Search student reports, rooms, buildings…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {feedbackToast && (
        <div className="alert alert-info toast-feedback-bar">
          <IconCheckCircle />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Issues Queue Cards */}
      {filteredIssues.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon-wrap">
            <IconCheckCircle />
          </div>
          <h3>No complaints found</h3>
          <p>No tickets match the selected status or filter criteria.</p>
        </div>
      ) : (
        <div className="manager-issue-grid">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={`manager-ticket-card ${issue.is_overdue ? 'is-overdue-ticket' : ''}`}
            >
              <div className="ticket-top-row">
                <div className="ticket-badges">
                  <StatusBadge status={issue.status} />
                  <PriorityBadge priority={issue.priority} />
                  {issue.is_overdue && <OverdueBadge />}
                  {issue.ai_used && (
                    <span className="tag-ai-pill">
                      <IconSparkles /> AI Triaged
                    </span>
                  )}
                </div>
                <span className="ticket-sla-text">
                  {issue.status === 'open' || issue.status === 'in_progress' ? (
                    <span className={issue.is_overdue ? 'text-danger font-bold' : 'muted'}>
                      <IconClock /> Due {relativeTime(issue.due_at)}
                    </span>
                  ) : (
                    <span className="text-ok">
                      <IconCheckCircle /> {formatDateTime(issue.resolved_at || issue.updated_at)}
                    </span>
                  )}
                </span>
              </div>

              <div className="ticket-body">
                <Link to={`/issues/${issue.id}`} className="ticket-title-link">
                  <h3>{issue.title}</h3>
                </Link>
                <div className="ticket-meta-info">
                  <span>📍 {location(issue)}</span>
                  <span>📁 {issue.category_name}</span>
                  {issue.department_name && <span className="dept-tag-pill">🏢 {issue.department_name}</span>}
                  <span>
                    <IconUsers /> {issue.reporter_count}{' '}
                    {issue.reporter_count === 1 ? 'affected student' : 'affected students'}
                  </span>
                  {issue.assigned_technician ? (
                    <span className="assigned-tech-pill" title={`Assigned to ${issue.assigned_technician}`}>
                      👷 Assigned: <strong>{issue.assigned_technician}</strong>
                    </span>
                  ) : (
                    <span className="unassigned-tech-pill">
                      ⏳ Unassigned
                    </span>
                  )}
                </div>
                <p className="ticket-description-text">{issue.description}</p>
              </div>

              {/* Workflow Actions Footer */}
              <div className="ticket-footer-actions">
                <div className="workflow-buttons-group">
                  {/* Dedicated Manager Action: Assign Task to Technical Team */}
                  <button
                    type="button"
                    className="btn btn-sm btn-assign-trigger"
                    disabled={actionLoading === issue.id}
                    onClick={() => handleOpenAssignModal(issue)}
                    title="Assign or reassign task to a technical team specialist"
                  >
                    <IconWrench /> {issue.assigned_technician ? 'Reassign Tech' : 'Assign to Tech'}
                  </button>

                  {issue.status === 'open' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={actionLoading === issue.id}
                        onClick={() => handleQuickStatus(issue.id, 'in_progress')}
                      >
                        Start Work
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        disabled={actionLoading === issue.id}
                        onClick={() => handleQuickStatus(issue.id, 'closed', true)}
                      >
                        Close Without Fixing
                      </button>
                    </>
                  )}

                  {issue.status === 'in_progress' && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={actionLoading === issue.id}
                      onClick={() => handleQuickStatus(issue.id, 'resolved')}
                    >
                      <IconCheckCircle /> Mark Resolved
                    </button>
                  )}

                  {issue.status === 'resolved' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={actionLoading === issue.id}
                        onClick={() => handleQuickStatus(issue.id, 'closed')}
                      >
                        Finalize & Close
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        disabled={actionLoading === issue.id}
                        onClick={() => handleQuickStatus(issue.id, 'in_progress', true)}
                      >
                        Reopen Issue
                      </button>
                    </>
                  )}

                  {issue.status === 'closed' && (
                    <span className="status-closed-pill">Ticket Closed</span>
                  )}
                </div>

                <Link to={`/issues/${issue.id}`} className="btn btn-sm btn-secondary">
                  Full Details <IconArrowRight />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mandatory Note Modal for Reopening or Closing without fixing */}
      {quickNoteModal && (
        <div className="modal-overlay">
          <div className="modal-dialog-card">
            <div className="modal-header">
              <h3>Staff Justification Note Required</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setQuickNoteModal(null)}
              >
                ✕
              </button>
            </div>
            <p className="modal-description">
              Campus policy mandates a justification note when reopening an issue or closing a complaint without repair.
            </p>
            <label className="field">
              <span className="field-label">Explanation Note</span>
              <textarea
                className="styled-textarea"
                rows={4}
                required
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Detail why this ticket cannot be resolved or what additional steps are needed..."
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setQuickNoteModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!noteInput.trim() || actionLoading}
                onClick={confirmModalStatus}
              >
                Confirm Status Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Task to Technical Team Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal-dialog-card assign-tech-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-with-icon">
                <IconWrench />
                <div>
                  <h3>Assign Task to Technical Team</h3>
                  <span className="modal-subtitle">Dispatch maintenance personnel to problem report</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setAssignModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="assign-modal-body">
              {/* Issue Summary Card */}
              <div className="modal-issue-summary">
                <div className="modal-ticket-head">
                  <span className="summary-issue-title">{assignModal.issue.title}</span>
                  <PriorityBadge priority={assignModal.issue.priority} />
                </div>
                <div className="summary-issue-meta">
                  <span>📍 {location(assignModal.issue)}</span>
                  <span>📁 {assignModal.issue.category_name}</span>
                  {assignModal.issue.department_name && <span>🏢 {assignModal.issue.department_name}</span>}
                </div>
                {assignModal.issue.assigned_technician && (
                  <div className="current-assignment-note">
                    Currently assigned to: <strong>{assignModal.issue.assigned_technician}</strong>
                  </div>
                )}
              </div>

              {/* Technician Dropdown Selector */}
              <label className="field">
                <span className="field-label">Choose Field Technician</span>
                <select
                  className="styled-select tech-select-styled"
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  required
                >
                  {technicians.map((tech) => {
                    const activeCount = issues.filter(
                      (i) => i.assigned_technician_id === tech.id && (i.status === 'open' || i.status === 'in_progress'),
                    ).length
                    return (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} — {tech.role} ({tech.status === 'online' ? 'On Duty' : 'Busy'} · {activeCount} active jobs)
                      </option>
                    )
                  })}
                </select>
              </label>

              {/* Dynamic Profile Preview Card of Selected Technician */}
              {selectedTech && (
                <div className="selected-tech-preview-card">
                  <div className="preview-card-avatar">
                    {selectedTech.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="preview-card-content">
                    <div className="preview-name-row">
                      <strong className="preview-tech-name">{selectedTech.name}</strong>
                      <span className={`status-dot-badge ${selectedTech.status}`}>
                        {selectedTech.status === 'online' ? '● On Duty' : '● Busy'}
                      </span>
                    </div>
                    <span className="preview-tech-role">{selectedTech.role}</span>
                    <div className="preview-tech-meta">
                      <span>📍 Zone: {selectedTech.zone}</span>
                      <span>📻 Radio: {selectedTech.radio}</span>
                      <span className="preview-tech-workload">
                        ⚡ {issues.filter((i) => i.assigned_technician_id === selectedTech.id && (i.status === 'open' || i.status === 'in_progress')).length} active jobs
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dispatch Handover Note */}
              <label className="field">
                <span className="field-label">Handover / Dispatch Instructions <em className="muted">(Optional)</em></span>
                <textarea
                  className="styled-textarea"
                  rows={2}
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="e.g. Bring replacement circuit breaker, inspect main breaker panel on 2nd floor..."
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setAssignModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-dispatch-action"
                disabled={!selectedTechId || actionLoading}
                onClick={confirmAssignment}
              >
                {actionLoading ? (
                  <span className="spinner-sm" />
                ) : (
                  <>
                    <IconWrench /> Dispatch Task to {selectedTech?.name.split(' ')[0] || 'Technician'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
