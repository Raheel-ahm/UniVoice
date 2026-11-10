import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  IconAlertCircle,
  IconBell,
  IconChartBar,
  IconDashboard,
  IconEmergency,
  IconGraduationCap,
  IconList,
  IconLogout,
  IconReport,
  IconSearch,
  IconShield,
  IconUsers,
  IconWrench,
} from './Icons.jsx'

export default function Layout() {
  const { user, signOut, isStaff, activeDepartment } = useAuth()
  const navigate = useNavigate()
  const [globalSearch, setGlobalSearch] = useState('')

  const displayName = user?.fullName || user?.email?.split('@')[0] || 'User'
  const roleSubtitle = isStaff
    ? `${activeDepartment || 'Department'} Manager`
    : 'Student Reporter'

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function handleSearchSubmit(e) {
    e.preventDefault()
    if (!globalSearch.trim()) return
    if (isStaff) {
      navigate('/manager/issues')
    } else {
      navigate('/my-reports')
    }
  }

  return (
    <div className={`layout-root ${isStaff ? 'theme-manager' : 'theme-student'}`}>
      {/* Left Sidebar matching screenshot aesthetic */}
      <aside className={`sidebar ${isStaff ? 'sidebar-staff' : 'sidebar-student'}`}>
        <div className="sidebar-top">
          {/* Brand header */}
          <Link to={isStaff ? '/manager' : '/dashboard'} className="sidebar-brand">
            <div className="brand-icon-box">
              {isStaff ? (
                <IconShield className="brand-logo-icon" />
              ) : (
                <IconGraduationCap className="brand-logo-icon" />
              )}
            </div>
            <div className="brand-text">
              <span className="brand-title">UniVoice</span>
              <span className="brand-portal-tag">
                {isStaff ? 'Manager Portal' : 'Student Portal'}
              </span>
            </div>
          </Link>

          {/* Navigation Links strictly based on role */}
          <nav className="sidebar-nav">
            {!isStaff ? (
              /* STUDENT PORTAL NAVIGATION */
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <IconDashboard />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/report"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <IconReport />
                  <span>Report Problem</span>
                </NavLink>

                <NavLink
                  to="/my-reports"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <IconList />
                  <span>My Reports</span>
                </NavLink>

                <NavLink
                  to="/emergency"
                  className={({ isActive }) => `sidebar-link emergency-nav-link ${isActive ? 'active' : ''}`}
                >
                  <IconEmergency />
                  <span>Emergency Hotline</span>
                </NavLink>
              </>
            ) : (
              /* MANAGER PORTAL NAVIGATION */
              <>
                <NavLink
                  to="/manager"
                  end
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <IconDashboard />
                  <span>Overview Dashboard</span>
                </NavLink>

                <NavLink
                  to="/manager/issues"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <IconWrench />
                  <span>Work Orders & Triage</span>
                </NavLink>

                <NavLink
                  to="/manager/escalations"
                  className={({ isActive }) => `sidebar-link escalation-nav-item ${isActive ? 'active' : ''}`}
                >
                  <IconAlertCircle />
                  <span>Escalations Queue</span>
                </NavLink>

                <NavLink
                  to="/manager/analytics"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <IconChartBar />
                  <span>SLA Analytics</span>
                </NavLink>

                <NavLink
                  to="/manager/team"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <IconUsers />
                  <span>Technicians Team</span>
                </NavLink>

                <NavLink
                  to="/emergency"
                  className={({ isActive }) => `sidebar-link emergency-nav-link ${isActive ? 'active' : ''}`}
                >
                  <IconEmergency />
                  <span>Emergency Dispatch</span>
                </NavLink>
              </>
            )}
          </nav>
        </div>

        {/* Sidebar Footer with user info & logout */}
        <div className="sidebar-bottom">
          <div className="sidebar-user-card">
            <div className="user-avatar-circle">{initials || 'U'}</div>
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">{displayName}</span>
              <span className="sidebar-user-role">{roleSubtitle}</span>
            </div>
          </div>

          <button type="button" className="sidebar-logout-btn" onClick={signOut} title="Sign Out">
            <IconLogout />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="main-wrapper">
        {/* Top Header Bar */}
        <header className="top-header">
          <form className="top-search-form" onSubmit={handleSearchSubmit}>
            <IconSearch className="top-search-icon" />
            <input
              type="text"
              placeholder={
                isStaff
                  ? 'Search department work orders, rooms, technicians…'
                  : 'Search campus issues, buildings, room…'
              }
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="top-search-input"
            />
          </form>

          <div className="top-header-right">
            {/* Quick Emergency Hotline Pill */}
            <Link to="/emergency" className="top-emergency-pill" title="Direct Campus Security Line">
              <span className="pulse-danger-dot" />
              <span className="emergency-pill-text">Security: (555) 0199</span>
            </Link>

            {/* Notification Bell */}
            <div className="notification-bell-btn" title="Notifications">
              <IconBell />
              <span className="notification-badge-dot" />
            </div>

            {/* Profile pill */}
            <div className="top-profile-pill">
              <div className="top-profile-avatar">{initials || 'U'}</div>
              <div className="top-profile-info">
                <span className="top-profile-name">{displayName}</span>
                <span className="top-profile-sub">{roleSubtitle}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="content-container">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
