import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { api } from '../lib/api.js'
import { IconGraduationCap, IconShield } from '../components/Icons.jsx'

export default function Login() {
  const [targetRole, setTargetRole] = useState('student') // 'student' | 'manager'
  const [studentMode, setStudentMode] = useState('signin') // 'signin' | 'signup'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  const isManager = targetRole === 'manager'

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)

    if (isManager || studentMode === 'signin') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        setError(err.message)
        setBusy(false)
        return
      }

      // Check role verification against targeted portal
      try {
        const { user: profile } = await api.get('/me')
        if (isManager && profile.role !== 'staff') {
          await supabase.auth.signOut()
          setError('Access Denied: This account has Student permissions. You cannot log into the Department Manager Portal.')
          setBusy(false)
          return
        }
      } catch (profileErr) {
        console.error('Profile check error:', profileErr)
      }
    } else {
      // Student Signup
      try {
        await api.post('/auth/signup', {
          full_name: fullName,
          email,
          password,
        })
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) {
          setError(err.message)
          setBusy(false)
          return
        }
      } catch (err) {
        setError(err.message)
        setBusy(false)
        return
      }
    }
    setBusy(false)
  }

  return (
    <div className={`auth-fullscreen-wrap ${isManager ? 'auth-manager-theme' : 'auth-student-theme'}`}>
      {/* Background glowing violet shapes */}
      <div className="auth-glow-orb orb-1" />
      <div className="auth-glow-orb orb-2" />

      <div className="auth-card-modern">
        {/* Role Selection Tabs */}
        <div className="role-switch-container">
          <button
            type="button"
            className={`role-select-box ${targetRole === 'student' ? 'active' : ''}`}
            onClick={() => {
              setTargetRole('student')
              setError(null)
              setEmail('')
              setPassword('')
            }}
          >
            <div className="role-icon-wrap student">
              <IconGraduationCap />
            </div>
            <div className="role-box-text">
              <strong>Student Portal</strong>
              <span>Report issues & track status</span>
            </div>
          </button>

          <button
            type="button"
            className={`role-select-box ${targetRole === 'manager' ? 'active' : ''}`}
            onClick={() => {
              setTargetRole('manager')
              setError(null)
              setEmail('')
              setPassword('')
            }}
          >
            <div className="role-icon-wrap manager">
              <IconShield />
            </div>
            <div className="role-box-text">
              <strong>Manager Portal</strong>
              <span>Restricted staff access</span>
            </div>
          </button>
        </div>

        {/* Top Brand Logo */}
        <div className="auth-brand-center">
          <div className={`auth-logo-box ${isManager ? 'manager-logo-bg' : ''}`}>
            {isManager ? (
              <IconShield className="auth-logo-svg" />
            ) : (
              <IconGraduationCap className="auth-logo-svg" />
            )}
          </div>
          <h1 className="auth-app-title">UniVoice</h1>
          <span className="auth-portal-badge">
            {isManager ? 'Department Manager Portal' : 'Student Maintenance Portal'}
          </span>
        </div>

        <p className="auth-tagline">
          {isManager
            ? 'Authorized personnel only. Department operations, SLA auto-escalation & technician triage.'
            : 'Report campus physical faults, water leaks, and broken facilities with AI assistance.'}
        </p>

        {/* Action Tabs: ONLY shown for Student Portal */}
        {!isManager && (
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={studentMode === 'signin'}
              className={`auth-tab ${studentMode === 'signin' ? 'active' : ''}`}
              onClick={() => {
                setStudentMode('signin')
                setError(null)
              }}
            >
              Sign In as Student
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={studentMode === 'signup'}
              className={`auth-tab ${studentMode === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setStudentMode('signup')
                setError(null)
              }}
            >
              Create Student Account
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-body">
          {!isManager && studentMode === 'signup' && (
            <label className="field">
              <span className="field-label">Full Name</span>
              <input
                className="styled-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                required
                maxLength={100}
                autoComplete="name"
              />
            </label>
          )}

          <label className="field">
            <span className="field-label">
              {isManager ? 'Manager Campus Email' : 'Student Email'}
            </span>
            <input
              type="email"
              className="styled-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isManager ? 'manager@campus.edu' : 'student@campus.edu'}
              required
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              type="password"
              className="styled-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete={!isManager && studentMode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>

          {error && <div className="alert alert-error">{error}</div>}
          {info && <div className="alert alert-info">{info}</div>}

          <button
            type="submit"
            className={`btn btn-primary btn-block btn-auth-submit ${isManager ? 'btn-manager-gradient' : ''}`}
            disabled={busy}
          >
            {busy ? (
              <span className="spinner-sm" />
            ) : isManager ? (
              'Sign In to Department Manager Portal'
            ) : studentMode === 'signin' ? (
              'Sign In as Student'
            ) : (
              'Register Student Account'
            )}
          </button>
        </form>

        <div className="auth-roles-explainer">
          <div className="role-note-item">
            {isManager ? <IconShield /> : <IconGraduationCap />}
            <span>
              {isManager
                ? 'Manager registration is closed to the public. Facilities supervisors sign in with administrative credentials.'
                : 'Student accounts have reporter access to submit new complaints and track repair status.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
