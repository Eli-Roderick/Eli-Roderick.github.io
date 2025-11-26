import React, { useState, useEffect } from 'react'
import { supabase, getCurrentUser, signInWithEmail, signUpWithEmail, signOut } from '../utils/supabase'

export default function SupabaseUserLogin({ onLogin, currentUser, onLogout }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showLogin, setShowLogin] = useState(!currentUser)
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [supabaseUser, setSupabaseUser] = useState(null)

  // Check for existing Supabase session on mount
  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const user = await getCurrentUser()
      if (user) {
        setSupabaseUser(user)
        onLogin(user.email)
        setShowLogin(false)
      }
    } catch (error) {
      console.warn('Error checking user:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return

    setLoading(true)
    setError('')

    try {
      let result
      if (isSignUp) {
        result = await signUpWithEmail(email, password)
        if (!result.error) {
          setError('Check your email for confirmation link!')
          setIsSignUp(false)
        }
      } else {
        result = await signInWithEmail(email, password)
        if (!result.error && result.data.user) {
          setSupabaseUser(result.data.user)
          onLogin(result.data.user.email)
          setShowLogin(false)
          setEmail('')
          setPassword('')
        }
      }

      if (result.error) {
        setError(result.error.message)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Auth error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      setSupabaseUser(null)
      onLogout()
      setShowLogin(true)
      setEmail('')
      setPassword('')
    } catch (error) {
      console.warn('Logout error:', error)
    }
  }

  // Show user info when logged in
  if (!showLogin && (currentUser || supabaseUser)) {
    const displayUser = supabaseUser?.email || currentUser
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        fontSize: '14px'
      }}>
        <span style={{ color: 'var(--muted)' }}>User:</span>
        <span style={{ color: 'var(--text)', fontWeight: '500' }}>
          {displayUser?.split('@')[0] || displayUser}
        </span>
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '4px',
            fontSize: '12px'
          }}
          title="Sign out"
        >
          Sign Out
        </button>
      </div>
    )
  }

  // Show login/signup form
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '2rem',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <h2 style={{
          margin: '0 0 1rem 0',
          fontSize: '20px',
          fontWeight: '600',
          color: 'var(--text)',
          textAlign: 'center'
        }}>
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>
        
        <p style={{
          margin: '0 0 1.5rem 0',
          fontSize: '14px',
          color: 'var(--muted)',
          textAlign: 'center',
          lineHeight: '1.4'
        }}>
          {isSignUp 
            ? 'Create an account to save your data securely in the cloud.'
            : 'Sign in to access your personalized data from any device.'
          }
        </p>

        {error && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: error.includes('Check your email') ? '#e7f3ff' : '#fee',
            border: `1px solid ${error.includes('Check your email') ? '#1a73e8' : '#f00'}`,
            borderRadius: '6px',
            fontSize: '14px',
            color: error.includes('Check your email') ? '#1a73e8' : '#c00',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text)',
              fontSize: '14px',
              outline: 'none',
              marginBottom: '1rem'
            }}
            autoFocus
            disabled={loading}
          />
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text)',
              fontSize: '14px',
              outline: 'none',
              marginBottom: '1rem'
            }}
            disabled={loading}
          />
          
          <button
            type="submit"
            disabled={!email.trim() || !password.trim() || loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: (email.trim() && password.trim() && !loading) ? '#1a73e8' : 'var(--border)',
              color: (email.trim() && password.trim() && !loading) ? 'white' : 'var(--muted)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: (email.trim() && password.trim() && !loading) ? 'pointer' : 'not-allowed',
              marginBottom: '1rem'
            }}
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#1a73e8',
              cursor: 'pointer',
              fontSize: '14px',
              textDecoration: 'underline'
            }}
            disabled={loading}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        {/* Environment status */}
        <div style={{
          marginTop: '1.5rem',
          padding: '0.5rem',
          backgroundColor: 'var(--bg)',
          borderRadius: '4px',
          fontSize: '12px',
          color: 'var(--muted)'
        }}>
          <div>Supabase: {process.env.REACT_APP_SUPABASE_URL ? '✅ Connected' : '❌ Not configured'}</div>
          <div>Environment: {process.env.REACT_APP_SUPABASE_ANON_KEY ? '✅ Ready' : '❌ Missing key'}</div>
        </div>
      </div>
    </div>
  )
}
