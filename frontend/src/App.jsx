import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { ManagerProvider } from './context/ManagerContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import StudentDashboard from './pages/StudentDashboard.jsx'
import ReportIssue from './pages/ReportIssue.jsx'
import MyReports from './pages/MyReports.jsx'
import IssueDetail from './pages/IssueDetail.jsx'
import Emergency from './pages/Emergency.jsx'
import ManagerOverview from './pages/manager/ManagerOverview.jsx'
import ManagerIssues from './pages/manager/ManagerIssues.jsx'
import ManagerEscalations from './pages/manager/ManagerEscalations.jsx'
import ManagerAnalytics from './pages/manager/ManagerAnalytics.jsx'
import ManagerTeam from './pages/manager/ManagerTeam.jsx'

export default function App() {
  const { session, loading, profileError, signOut, isStaff } = useAuth()

  if (loading) {
    return (
      <div className="center-screen">
        <div className="loading-card">
          <div className="spinner-purple" />
          <p className="muted">Loading UniVoice portal…</p>
        </div>
      </div>
    )
  }

  if (!session) return <Login />

  if (profileError) {
    return (
      <div className="center-screen">
        <div className="card narrow">
          <p className="alert alert-error">{profileError}</p>
          <button type="button" className="btn btn-ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    )
  }

  const defaultHome = isStaff ? '/manager' : '/dashboard'

  return (
    <ManagerProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to={defaultHome} replace />} />

          {/* STUDENT ROUTES - Only accessible if user is NOT staff */}
          {!isStaff && (
            <>
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="report" element={<ReportIssue />} />
              <Route path="my-reports" element={<MyReports />} />
            </>
          )}

          {/* MANAGER ROUTES - Only accessible if user IS staff */}
          {isStaff && (
            <>
              <Route path="manager" element={<ManagerOverview />} />
              <Route path="manager/issues" element={<ManagerIssues />} />
              <Route path="manager/escalations" element={<ManagerEscalations />} />
              <Route path="manager/analytics" element={<ManagerAnalytics />} />
              <Route path="manager/team" element={<ManagerTeam />} />
              <Route path="staff" element={<Navigate to="/manager" replace />} />
            </>
          )}

          {/* STRICT ACCESS GUARDS: If student tries to visit manager routes, redirect back */}
          {!isStaff && (
            <>
              <Route path="manager" element={<Navigate to="/dashboard" replace />} />
              <Route path="manager/*" element={<Navigate to="/dashboard" replace />} />
              <Route path="staff" element={<Navigate to="/dashboard" replace />} />
            </>
          )}

          {/* If manager tries to visit student routes, redirect back to manager */}
          {isStaff && (
            <>
              <Route path="dashboard" element={<Navigate to="/manager" replace />} />
              <Route path="report" element={<Navigate to="/manager" replace />} />
              <Route path="my-reports" element={<Navigate to="/manager" replace />} />
            </>
          )}

          {/* Common & Emergency Routes accessible by both */}
          <Route path="emergency" element={<Emergency />} />
          <Route path="issues/:id" element={<IssueDetail />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to={defaultHome} replace />} />
        </Route>
      </Routes>
    </ManagerProvider>
  )
}
