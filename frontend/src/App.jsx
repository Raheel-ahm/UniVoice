import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import ReportIssue from './pages/ReportIssue.jsx'
import MyReports from './pages/MyReports.jsx'
import IssueDetail from './pages/IssueDetail.jsx'
import StaffDashboard from './pages/StaffDashboard.jsx'

export default function App() {
  const { session, user, loading, profileError, signOut } = useAuth()

  if (loading) return <div className="center-screen muted">Loading…</div>
  if (!session) return <Login />
  if (profileError) {
    return (
      <div className="center-screen">
        <div className="card narrow">
          <p className="alert alert-error">{profileError}</p>
          <button type="button" className="btn btn-ghost" onClick={signOut}>Sign out</button>
        </div>
      </div>
    )
  }

  const home = user.role === 'staff' ? '/staff' : '/report'

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to={home} replace />} />
        {user.role === 'reporter' && (
          <>
            <Route path="report" element={<ReportIssue />} />
            <Route path="my-reports" element={<MyReports />} />
          </>
        )}
        {user.role === 'staff' && <Route path="staff" element={<StaffDashboard />} />}
        <Route path="issues/:id" element={<IssueDetail />} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Route>
    </Routes>
  )
}
