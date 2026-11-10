import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useManager } from '../../context/ManagerContext.jsx'
import { formatDateTime, location, relativeTime } from '../../lib/format.js'
import { OverdueBadge, PriorityBadge, StatusBadge } from '../../components/Badges.jsx'
import {
  IconArrowRight,
  IconCheckCircle,
  IconClock,
  IconEmergency,
  IconPhone,
  IconUsers,
  IconWrench,
} from '../../components/Icons.jsx'

export default function ManagerEscalations() {
  const { departmentName, issues, updateStatus } = useManager()

  const escalatedIssues = useMemo(() => {
    return issues.filter((i) => i.is_overdue || (i.priority === 'high' && i.status !== 'closed' && i.status !== 'resolved'))
  }, [issues])

  return (
    <div className="page-container manager-page">
      {/* High Alert Hero Header */}
      <div className="escalations-hero-card">
        <div className="escalation-hero-left">
          <div className="alert-pulse-circle">
            <IconEmergency />
          </div>
          <div>
            <span className="escalation-alert-tag">High Priority Escalation Queue</span>
            <h1>SLA Breaches & Critical Campus Faults</h1>
            <p>
              Tickets that have exceeded their target resolution time (High: 24h, Med: 72h, Low: 7d) or present immediate safety risks.
            </p>
          </div>
        </div>

        <div className="escalation-hero-right">
          <div className="escalation-metric-badge">
            <span className="esc-count">{escalatedIssues.length}</span>
            <span className="esc-label">Critical Tickets</span>
          </div>
          <Link to="/emergency" className="btn btn-danger">
            <IconPhone /> Campus Security Dispatch
          </Link>
        </div>
      </div>

      {escalatedIssues.length === 0 ? (
        <div className="card modern-form-card center-card-content mt-lg">
          <div className="success-icon-wrap">
            <IconCheckCircle />
          </div>
          <h2>Zero Overdue Escalations!</h2>
          <p className="muted">
            All physical maintenance requests in {departmentName} are currently within their SLA target times.
          </p>
          <Link to="/manager/issues" className="btn btn-primary mt-md">
            Review Open Queue
          </Link>
        </div>
      ) : (
        <div className="escalation-cards-container mt-lg">
          {escalatedIssues.map((issue) => (
            <div key={issue.id} className="escalation-item-card">
              <div className="esc-header-row">
                <div className="esc-badges">
                  {issue.is_overdue && <OverdueBadge />}
                  <PriorityBadge priority={issue.priority} />
                  <StatusBadge status={issue.status} />
                </div>
                <div className="esc-time-pill danger">
                  <IconClock /> Overdue by {relativeTime(issue.due_at)}
                </div>
              </div>

              <div className="esc-title-section">
                <Link to={`/issues/${issue.id}`} className="esc-title-link">
                  <h2>{issue.title}</h2>
                </Link>
                <div className="esc-location-bar">
                  <span>📍 {location(issue)}</span>
                  <span>📁 {issue.category_name}</span>
                  <span>
                    <IconUsers /> {issue.reporter_count} students affected
                  </span>
                  <span>Reported: {formatDateTime(issue.created_at)}</span>
                </div>
              </div>

              <div className="esc-desc-box">
                <p>{issue.description}</p>
              </div>

              {issue.reporter_notes?.length > 0 && (
                <div className="esc-notes-preview">
                  <strong>Student Feedback Note:</strong>
                  <p>"{issue.reporter_notes[0].note}"</p>
                </div>
              )}

              <div className="esc-actions-bar">
                <div className="esc-action-buttons">
                  {issue.status === 'open' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => updateStatus(issue.id, 'in_progress')}
                    >
                      <IconWrench /> Dispatch Technician & Start Work
                    </button>
                  )}
                  {issue.status === 'in_progress' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => updateStatus(issue.id, 'resolved')}
                    >
                      <IconCheckCircle /> Complete & Mark Resolved
                    </button>
                  )}
                  <Link to="/emergency" className="btn btn-ghost">
                    <IconEmergency /> Security Assistance
                  </Link>
                </div>

                <Link to={`/issues/${issue.id}`} className="btn btn-secondary">
                  Full Ticket Details <IconArrowRight />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Escalation Policy Guide Card */}
      <div className="card notice-card mt-lg">
        <div className="notice-card-header">
          <h4>Escalation Guidelines for Department Managers</h4>
          <span className="badge-pill">Standard Operating Procedure</span>
        </div>
        <div className="protocol-steps">
          <div className="protocol-step">
            <span className="step-num">1</span>
            <div>
              <strong>Immediate Triage within 1 Hour</strong>
              <p>Overdue complaints automatically alert the Facilities Dean. Review building access and power hazards.</p>
            </div>
          </div>
          <div className="protocol-step">
            <span className="step-num">2</span>
            <div>
              <strong>Reassign Field Technicians</strong>
              <p>Pull non-urgent staff from cosmetic or low-priority tickets to contain leaks and electrical risks.</p>
            </div>
          </div>
          <div className="protocol-step">
            <span className="step-num">3</span>
            <div>
              <strong>Keep Reporter Community Informed</strong>
              <p>Post status progress notes. The app broadcasts updates to all students who joined the report without revealing names.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
