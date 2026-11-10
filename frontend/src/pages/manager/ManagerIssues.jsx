import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useManager } from '../../context/ManagerContext.jsx'
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
  const { departmentName, issues, updateStatus } = useManager()
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [quickNoteModal, setQuickNoteModal] = useState(null) // { issueId, nextStatus }
  const [noteInput, setNoteInput] = useState('')

  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue' && !i.is_overdue) return false
        if (statusFilter === 'active' && !(i.status === 'open' || i.status === 'in_progress')) return false
        if (statusFilter !== 'overdue' && statusFilter !== 'active' && i.status !== statusFilter) return false
      }
      if (priorityFilter !== 'all' && i.priority !== priorityFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const match = [i.title, i.building, i.room, i.category_name, i.description].some((field) =>
          field?.toLowerCase().includes(q),
        )
        if (!match) return false
      }
      return true
    })
  }, [issues, statusFilter, priorityFilter, search])

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
    setActionLoading(quickNoteModal.issueId)
    try {
      await updateStatus(quickNoteModal.issueId, quickNoteModal.nextStatus, noteInput)
      setQuickNoteModal(null)
      setNoteInput('')
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

        <div className="search-input-box">
          <IconSearch className="search-icon-inside" />
          <input
            type="search"
            className="dashboard-search-field"
            placeholder="Search by title, room, building…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

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
                  <span>
                    <IconUsers /> {issue.reporter_count}{' '}
                    {issue.reporter_count === 1 ? 'affected student' : 'affected students'}
                  </span>
                </div>
                <p className="ticket-description-text">{issue.description}</p>
              </div>

              {/* Workflow Actions Footer */}
              <div className="ticket-footer-actions">
                <div className="workflow-buttons-group">
                  {issue.status === 'open' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={actionLoading === issue.id}
                        onClick={() => handleQuickStatus(issue.id, 'in_progress')}
                      >
                        <IconWrench /> Start Work
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
    </div>
  )
}
