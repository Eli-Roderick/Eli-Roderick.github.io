import React, { useState, useEffect } from 'react'
import { signInWithEmail, signUpWithEmail, getCurrentUser } from '../utils/supabase'

export default function UserAuth({ currentUser, onLogin, onLogout }) {
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await getCurrentUser()
        if (user) {
          onLogin(user)
        }
      } catch (error) {
        console.error('Error checking session:', error)
      }
    }
    checkSession()
  }, [onLogin])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanPassword = password.trim()

      let result
      if (isSignUp) {
        result = await signUpWithEmail(cleanEmail, cleanPassword)
      } else {
        result = await signInWithEmail(cleanEmail, cleanPassword)
      }

      if (result.error) {
        setError(result.error.message)
        return
      }

      if (result.data.user) {
        // Login successful
        onLogin(result.data.user)
        setShowLogin(false)
        setEmail('')
        setPassword('')
      }
      
    } catch (error) {
      console.error('Authentication error:', error)
      setError('Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (user) => {
    onLogin(user)
  }

  const handleLogout = () => {
    onLogout()
  }

  if (currentUser) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '6px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: '#1a73e8',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          {currentUser.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
            {currentUser.email}
          </span>
          <button
            onClick={handleLogout}
            style={{
              fontSize: '12px',
              color: 'var(--muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0
            }}
          >
            Switch User
          </button>
        </div>
      </div>
    )
  }

  if (!showLogin) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        padding: '2rem',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        maxWidth: '400px',
        margin: '0 auto'
      }}>
        <h2 style={{ margin: 0, color: 'var(--text)' }}>Welcome</h2>
        <p style={{ margin: 0, color: 'var(--muted)', textAlign: 'center' }}>
          Sign in to access your personalized search experiments
        </p>
        
        <button
          onClick={() => setShowLogin(true)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#1a73e8',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Sign In / Sign Up
        </button>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
      padding: '2rem',
      backgroundColor: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      <h2 style={{ margin: 0, color: 'var(--text)' }}>
        {isSignUp ? 'Sign Up' : 'Sign In'}
      </h2>
      
      {error && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          color: '#c00',
          fontSize: '14px',
          width: '100%'
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: 'var(--text)' }}>
            Email:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              backgroundColor: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '14px',
              outline: 'none'
            }}
            required
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: 'var(--text)' }}>
            Password:
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              backgroundColor: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '14px',
              outline: 'none'
            }}
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.75rem',
            backgroundColor: loading ? '#ccc' : '#1a73e8',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
      </form>
      
      <button
        type="button"
        onClick={() => setIsSignUp(!isSignUp)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
      </button>
      
      <button
        onClick={() => {
          setShowLogin(false)
          setError('')
          setIsSignUp(false)
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        ← Back
      </button>
    </div>
  )
}
