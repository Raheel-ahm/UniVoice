import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { supabaseConfigured } from './lib/supabase.js'

function SetupNeeded() {
  return (
    <div className="center-screen">
      <div className="card narrow">
        <h1>UniVoice setup needed</h1>
        <p>
          Copy <code>.env.example</code> to <code>.env.local</code> and set <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev server.
        </p>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {supabaseConfigured ? (
        <AuthProvider>
          <App />
        </AuthProvider>
      ) : (
        <SetupNeeded />
      )}
    </BrowserRouter>
  </StrictMode>,
)
