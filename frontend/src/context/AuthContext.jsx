import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { api } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still loading
  const [profile, setProfile] = useState({ userId: null, user: null, error: null })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    api
      .get('/me')
      .then(({ user: me }) => {
        if (!cancelled) setProfile({ userId, user: me, error: null })
      })
      .catch((err) => {
        if (!cancelled) setProfile({ userId, user: null, error: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  // Ignore a profile loaded for a previous account.
  const current = userId && profile.userId === userId ? profile : { user: null, error: null }
  const user = current.user
  const profileError = current.error
  const loading = session === undefined || (Boolean(session) && !user && !profileError)

  // Strict role check: role is either 'staff' (Manager) or 'reporter' (Student)
  const isStaff = user?.role === 'staff'
  const isStudent = user?.role === 'reporter'
  const activeDepartment = user?.departmentName || 'Electrical'

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        profileError,
        signOut,
        isStaff,
        isStudent,
        activeDepartment,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
