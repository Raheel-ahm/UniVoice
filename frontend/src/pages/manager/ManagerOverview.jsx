import { Link } from 'react-router-dom'
import { useManager } from '../../context/ManagerContext.jsx'
import { formatDateTime, location, relativeTime } from '../../lib/format.js'
import { OverdueBadge, PriorityBadge, StatusBadge } from '../../components/Badges.jsx'
import {
  IconArrowRight,
  IconCheckCircle,
  IconClock,
  IconEmergency,
  IconShield,
  IconSparkles,
  IconUsers,
  IconWrench,
} from '../../components/Icons.jsx'

export default function ManagerOverview() {
  const { departmentName, issues, summary, isUsingLiveApi } = useManager()

  const complianceRate = summary.total
    ? Math.round(((summary.total - summary.overdue) / summary.total) * 100)
    : 100

  return (
    <div className="dashboard-container manager-portal-view">
      {/* Manager Hero Banner matching reference image violet theme */}
      <div className="hero-banner staff-hero">
        <div className="hero-content">
          <div className="staff-role-badge">
            <IconShield /> Department Operations Hub
          </div>
          <h1 className="hero-title">{departmentName} Manager Dashboard</h1>
          <p className="hero-subtitle">
            Manage incoming physical maintenance requests, enforce SLA resolution times, and review auto-escalated overdue issues.
          </p>
          <div className="hero-actions">
            <Link to="/manager/issues" className="btn btn-hero">
              <IconWrench /> Open Triage Queue ({summary.open})
            </Link>
            <Link to="/manager/escalations" className="btn btn-hero-ghost">
              <IconEmergency /> Escalated Issues ({summary.overdue})
            </Link>
          </div>
        </div>
        <div className="hero-illustration staff-hero-deco" aria-hidden="true">
          <div className="staff-metric-bubble">
            <span className="metric-bubble-title">Department SLA</span>
            <span className="metric-bubble-stat">{complianceRate}%</span>
            <span className="metric-bubble-sub">
              {isUsingLiveApi ? 'Connected to live database' : 'Demonstration Hub'}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards matching Finanace style in screenshot */}
      <div className="section-header">
        <h2>Operations Overview</h2>
        <span className="live-indicator">
          <span className="pulse-dot" /> Live SLA Monitoring
        </span>
      </div>

      <div className="stats-cards-grid staff-stats">
        <Link
          to="/manager/issues?status=overdue"
          className={`stat-card ${summary.overdue > 0 ? 'overdue-alert-card' : ''}`}
          title="Filter overdue & escalated issues"
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
        </Link>

        <Link to="/manager/issues?status=open" className="stat-card" title="Filter open & unassigned work orders">
          <div className="stat-card-graphic">
            <div className="graphic-icon bg-violet">
              <IconSparkles />
            </div>
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{summary.open}</span>
            <span className="stat-card-label">Open / Unassigned</span>
          </div>
        </Link>

        <Link to="/manager/issues?status=in_progress" className="stat-card active-stat-card" title="Filter in-progress work orders">
          <div className="stat-card-graphic">
            <div className="graphic-icon bg-indigo">
              <IconWrench />
            </div>
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{summary.in_progress}</span>
            <span className="stat-card-label">In Progress Work Orders</span>
          </div>
        </Link>

        <Link to="/manager/issues?status=resolved" className="stat-card" title="Filter resolved work orders">
          <div className="stat-card-graphic">
            <div className="graphic-icon bg-emerald">
              <IconCheckCircle />
            </div>
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{summary.resolved}</span>
            <span className="stat-card-label">Resolved This Month</span>
          </div>
        </Link>
      </div>

      {summary.overdue > 0 && (
        <div className="alert-escalation-banner">
          <div className="escalation-icon">
            <IconEmergency />
          </div>
          <div className="escalation-content">
            <strong>
              {summary.overdue} {summary.overdue === 1 ? 'critical issue has' : 'critical issues have'} breached target SLA!
            </strong>
            <p>
              Auto-escalated to the top of the manager queue. Assigned technicians must be dispatched immediately.
            </p>
          </div>
          <Link to="/manager/escalations" className="btn btn-sm btn-danger">
            View Escalations →
          </Link>
        </div>
      )}

      {/* Two Column Dashboard */}
      <div className="dashboard-columns">
        <div className="main-content-column">
          {/* Quick Action Navigation Cards (like Enrolled Courses in screenshot) */}
          <div className="section-header">
            <h2>Department Workstations</h2>
          </div>

          <div className="action-cards-grid">
            <div className="action-card violet-tint">
              <div className="action-card-text">
                <h3>Work Orders & Triage</h3>
                <p>Assign technicians and step through the fixed status workflow.</p>
                <Link to="/manager/issues" className="btn btn-action-pill">
                  Manage Queue <IconArrowRight />
                </Link>
              </div>
              <div className="action-card-deco">
                <IconWrench />
              </div>
            </div>

            <div className="action-card soft-tint">
              <div className="action-card-text">
                <h3>SLA Analytics & Metrics</h3>
                <p>Review resolution times and campus building hotspots.</p>
                <Link to="/manager/analytics" className="btn btn-action-pill">
                  View Analytics <IconArrowRight />
                </Link>
              </div>
              <div className="action-card-deco">
                <IconClock />
              </div>
            </div>
          </div>

          {/* Recent Department Complaints */}
          <div className="section-header mt-lg">
            <h2>Recent Maintenance Requests</h2>
            <Link to="/manager/issues" className="see-all-link">
              View all ({issues.length}) <IconArrowRight />
            </Link>
          </div>

          {issues.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon-wrap">
                <IconCheckCircle />
              </div>
              <h3>Queue is clear</h3>
              <p>No active issues reported for {departmentName}.</p>
            </div>
          ) : (
            <ul className="issue-list">
              {issues.slice(0, 5).map((issue) => (
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
                        {location(issue)} · {issue.category_name} · {issue.reporter_count}{' '}
                        {issue.reporter_count === 1 ? 'affected student' : 'affected students'}
                      </span>
                      <span className={`small ${issue.is_overdue ? 'text-danger overdue-text' : 'muted'}`}>
                        {issue.status === 'open' || issue.status === 'in_progress'
                          ? `SLA Target: ${relativeTime(issue.due_at)}`
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
                  <p>Critical hazards · Within 24 hours</p>
                </div>
                <span className="sla-timer-badge">24h SLA</span>
              </li>
              <li className="sla-item medium">
                <span className="sla-dot warning" />
                <div className="sla-info">
                  <strong>Medium Priority</strong>
                  <p>Equipment disruption · Within 72 hours</p>
                </div>
                <span className="sla-timer-badge">72h SLA</span>
              </li>
              <li className="sla-item low">
                <span className="sla-dot normal" />
                <div className="sla-info">
                  <strong>Low Priority</strong>
                  <p>Aesthetic & wear · Within 7 days</p>
                </div>
                <span className="sla-timer-badge">7d SLA</span>
              </li>
            </ul>
          </div>

          {/* On-Duty Technicians Widget */}
          <div className="notice-card">
            <div className="notice-card-header">
              <h4>Technicians On Shift</h4>
              <Link to="/manager/team" className="see-all-link">
                Roster
              </Link>
            </div>
            <ul className="technician-mini-list">
              <li className="technician-mini-item">
                <span className="status-indicator online" />
                <div>
                  <strong>David Miller (Lead)</strong>
                  <span className="small muted">Zone: Science Blocks A–D · Radio #12</span>
                </div>
              </li>
              <li className="technician-mini-item">
                <span className="status-indicator online" />
                <div>
                  <strong>Sarah Chen</strong>
                  <span className="small muted">Zone: Central Library & Student Hub</span>
                </div>
              </li>
              <li className="technician-mini-item">
                <span className="status-indicator busy" />
                <div>
                  <strong>Marcus Vance</strong>
                  <span className="small muted">On call: Engineering Hall C</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Student Anonymity Notice */}
          <div className="notice-card privacy-card">
            <div className="privacy-header">
              <IconUsers />
              <h4>Reporter Confidentiality</h4>
            </div>
            <p>
              UniVoice strictly protects student identities through database security invokers. Staff only see complaint counts and technical descriptions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
