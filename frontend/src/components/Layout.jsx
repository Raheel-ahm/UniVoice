import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">U</span>
            UniVoice
          </Link>

          {user && (
            <nav className="nav">
              {user.role === 'reporter' ? (
                <>
                  <NavLink to="/report">Report a problem</NavLink>
                  <NavLink to="/my-reports">My reports</NavLink>
                </>
              ) : (
                <NavLink to="/staff">Dashboard</NavLink>
              )}
            </nav>
          )}

          <div className="topbar-right">
            {user && (
              <div className="user-menu">
                <span className="user-name">
                  {user.fullName || user.email}
                  {user.role === 'staff' && user.departmentName ? ` · ${user.departmentName}` : ''}
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={signOut}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}
