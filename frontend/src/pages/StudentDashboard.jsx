import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { formatDateTime, location } from '../lib/format.js'
import { PriorityBadge, StatusBadge } from '../components/Badges.jsx'
import {
  IconArrowRight,
  IconCheckCircle,
  IconClock,
  IconEmergency,
  IconReport,
  IconSparkles,
  IconUsers,
} from '../components/Icons.jsx'

function getTodayFormatted() {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [issues, setIssues] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get('/issues/mine')
      .then((r) => setIssues(r.issues))
      .catch((err) => setError(err.message))
  }, [])

  const stats = useMemo(() => {
    if (!issues) return { total: 0, inProgress: 0, resolved: 0, joined: 0 }
    return {
      total: issues.length,
      inProgress: issues.filter((i) => i.status === 'in_progress' || i.status === 'open').length,
      resolved: issues.filter((i) => i.status === 'resolved' || i.status === 'closed').length,
      joined: issues.filter((i) => !i.is_original).length,
    }
  }, [issues])

  const firstName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Student'

  const [todayFormatted] = useState(getTodayFormatted)

  return (
    <div className="dashboard-container">
      {/* Hero Banner matching the uploaded screenshot */}
      <div className="hero-banner">
        <div className="hero-content">
          <span className="hero-date">{todayFormatted}</span>
          <h1 className="hero-title">Welcome back, {firstName}!</h1>
          <p className="hero-subtitle">
            Always stay updated in your student portal. Report physical campus issues with instant AI triage.
          </p>
          <div className="hero-actions">
            <Link to="/report" className="btn btn-hero">
              <IconSparkles /> Report a Problem
            </Link>
            <Link to="/emergency" className="btn btn-hero-ghost">
              <IconEmergency /> Emergency Hotline
            </Link>
          </div>
        </div>
        <div className="hero-illustration" aria-hidden="true">
          {/* Custom 3D-styled SVG illustration */}
          <div className="illustration-wrapper">
            <svg width="220" height="180" viewBox="0 0 220 180" fill="none">
              <defs>
                <linearGradient id="capGrad" x1="20" y1="20" x2="160" y2="120" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#EDE9FE" />
                  <stop offset="1" stopColor="#C4B5FD" />
                </linearGradient>
                <linearGradient id="backpackGrad" x1="120" y1="40" x2="200" y2="160" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FDBA74" />
                  <stop offset="1" stopColor="#FB923C" />
                </linearGradient>
                <filter id="softShadow" x="-10%" y="-10%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#4C1D95" floodOpacity="0.25" />
                </filter>
              </defs>
              {/* Floating 3D Mortarboard */}
              <g filter="url(#softShadow)">
                <polygon points="90,30 160,55 90,80 20,55" fill="url(#capGrad)" />
                <path d="M45,64 L45,100 C45,115 135,115 135,100 L135,64 Z" fill="#DDD6FE" />
                <circle cx="90" cy="55" r="4" fill="#7C3AED" />
                <path d="M90,55 Q135,70 145,105" stroke="#7C3AED" strokeWidth="3" fill="none" />
                <rect x="141" y="105" width="8" height="14" rx="2" fill="#7C3AED" />
              </g>
              {/* Floating Backpack 3D Icon */}
              <g filter="url(#softShadow)">
                <rect x="145" y="70" width="55" height="70" rx="14" fill="url(#backpackGrad)" />
                <rect x="155" y="80" width="35" height="22" rx="6" fill="#FED7AA" />
                <rect x="155" y="108" width="35" height="24" rx="6" fill="#F97316" />
                <path d="M160,70 C160,55 185,55 185,70" stroke="#EA580C" strokeWidth="4" fill="none" />
              </g>
              {/* Floating Sparkles & Dots */}
              <circle cx="28" cy="120" r="6" fill="#F472B6" />
              <circle cx="120" cy="150" r="4" fill="#38BDF8" />
              <circle cx="185" cy="35" r="5" fill="#FBBF24" />
            </svg>
          </div>
        </div>
      </div>

      {/* Stat Cards Row matching "Finanace" style in screenshot */}
      <div className="section-header">
        <h2>Campus Overview</h2>
        <Link to="/my-reports" className="see-all-link">
          View all reports <IconArrowRight />
        </Link>
      </div>

      <div className="stats-cards-grid">
        <div className="stat-card">
          <div className="stat-card-graphic">
            <div className="graphic-icon bg-violet">
              <IconReport />
            </div>
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{issues ? stats.total : '—'}</span>
            <span className="stat-card-label">Total Reported</span>
          </div>
        </div>

        <div className="stat-card featured-stat">
          <div className="stat-card-graphic">
            <div className="graphic-icon bg-indigo">
              <IconClock />
            </div>
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{issues ? stats.inProgress : '—'}</span>
            <span className="stat-card-label">Active / In Progress</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-graphic">
            <div className="graphic-icon bg-emerald">
              <IconCheckCircle />
            </div>
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{issues ? stats.resolved : '—'}</span>
            <span className="stat-card-label">Resolved Issues</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-graphic">
            <div className="graphic-icon bg-sky">
              <IconUsers />
            </div>
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{issues ? stats.joined : '—'}</span>
            <span className="stat-card-label">Joined Reports</span>
          </div>
        </div>
      </div>

      {/* Two-Column Layout: Quick Actions & Recent Reports vs Daily Notices */}
      <div className="dashboard-columns">
        <div className="main-content-column">
          {/* Quick Action Cards matching "Enrolled Courses" in screenshot */}
          <div className="section-header">
            <h2>Quick Actions</h2>
          </div>

          <div className="action-cards-grid">
            <div className="action-card violet-tint">
              <div className="action-card-text">
                <h3>Report New Problem</h3>
                <p>AI suggests department, category & priority automatically.</p>
                <Link to="/report" className="btn btn-action-pill">
                  Report <IconArrowRight />
                </Link>
              </div>
              <div className="action-card-deco">
                <IconSparkles />
              </div>
            </div>

            <div className="action-card soft-tint">
              <div className="action-card-text">
                <h3>Track Status</h3>
                <p>Monitor SLA countdowns and technician fix progress.</p>
                <Link to="/my-reports" className="btn btn-action-pill">
                  View <IconArrowRight />
                </Link>
              </div>
              <div className="action-card-deco">
                <IconClock />
              </div>
            </div>
          </div>

          {/* Recent Reports List */}
          <div className="section-header mt-lg">
            <h2>Recent Reports</h2>
            <Link to="/my-reports" className="see-all-link">
              See all
            </Link>
          </div>

          {error && <p className="alert alert-error">{error}</p>}
          {!issues && <p className="muted">Loading reports…</p>}

          {issues && issues.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon-wrap">
                <IconReport />
              </div>
              <h3>No campus problems reported yet</h3>
              <p>When you spot broken facilities, lighting faults or water leaks, report them here.</p>
              <Link to="/report" className="btn btn-primary">
                Report Your First Issue
              </Link>
            </div>
          ) : (
            <ul className="issue-list">
              {issues?.slice(0, 4).map((issue) => (
                <li key={issue.id}>
                  <Link to={`/issues/${issue.id}`} className="issue-row">
                    <div className="issue-row-main">
                      <strong>{issue.title}</strong>
                      <span className="small muted">
                        {location(issue)} · {issue.category_name} · {issue.department_name}
                      </span>
                      <span className="small muted">
                        {issue.is_original ? 'Reported' : 'Joined'} {formatDateTime(issue.joined_at)}
                        {issue.reporter_count > 1 && ` · ${issue.reporter_count} students affected`}
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

        {/* Right Sidebar Column matching "Daily notice" in screenshot */}
        <div className="sidebar-column">
          {/* Emergency Hotline Widget */}
          <div className="notice-card emergency-widget">
            <div className="widget-header">
              <div className="widget-icon danger">
                <IconEmergency />
              </div>
              <div>
                <h4>Emergency Contact</h4>
                <span className="small-sub">Campus Security 24/7</span>
              </div>
            </div>
            <p className="emergency-widget-text">
              Fire, hazards, gas leaks, or injuries must be phoned in directly.
            </p>
            <div className="widget-call-row">
              <span className="widget-phone">(555) 0199</span>
              <Link to="/emergency" className="btn btn-sm btn-danger">
                Protocol
              </Link>
            </div>
          </div>

          {/* Daily Notices matching screenshot */}
          <div className="notice-card">
            <div className="notice-card-header">
              <h4>Daily Notices</h4>
              <span className="badge-pill">Campus Facilities</span>
            </div>
            <ul className="notice-list">
              <li className="notice-item">
                <span className="notice-dot warning" />
                <div>
                  <strong>HVAC Air Filter Replacement</strong>
                  <p>Scheduled maintenance in Engineering Hall C from 2:00 PM to 4:00 PM today.</p>
                  <span className="notice-time">2 hours ago</span>
                </div>
              </li>
              <li className="notice-item">
                <span className="notice-dot success" />
                <div>
                  <strong>Library 2nd Floor Water Leak Fixed</strong>
                  <p>Plumbing department completed the valve repair. Study area is reopened.</p>
                  <span className="notice-time">Today, 9:15 AM</span>
                </div>
              </li>
              <li className="notice-item">
                <span className="notice-dot info" />
                <div>
                  <strong>AI Duplicate Detection Active</strong>
                  <p>Similar issues are automatically matched so multiple students can join one repair ticket.</p>
                  <span className="notice-time">System note</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Quick AI Tip Card */}
          <div className="notice-card ai-feature-card">
            <div className="ai-card-inner">
              <div className="ai-icon-bubble">
                <IconSparkles />
              </div>
              <h4>AI Assisted Reporting</h4>
              <p>
                Take a photo and write a short description. Our model suggests category, department, and priority. You
                can review or edit before submitting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
