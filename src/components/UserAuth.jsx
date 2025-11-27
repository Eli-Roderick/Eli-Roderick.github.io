import React, { useState, useEffect } from 'react'
import { signInWithEmail, signUpWithEmail, getCurrentUser } from '../utils/supabase'

export default function UserAuth({ currentUser, onLogin, onLogout }) {
  const [showLogin, setShowLogin] = useState(false)
  const [username, setUsername] = useState('')
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
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const cleanUsername = username.trim().toLowerCase()
      const cleanPassword = password.trim()
      
      // Convert username to email format for Supabase (since Supabase requires email)
      const email = `${cleanUsername}@local.dev`

      let result
      if (isSignUp) {
        result = await signUpWithEmail(email, cleanPassword)
      } else {
        result = await signInWithEmail(email, cleanPassword)
      }

      if (result.error) {
        setError(result.error.message)
        return
      }

      if (result.data.user) {
        // Add username to user metadata for display
        const { updateUser } = await import('../utils/supabase')
        await updateUser({ 
          data: { 
            display_name: cleanUsername,
            username: cleanUsername 
          } 
        })
        
        // Login successful
        onLogin({ ...result.data.user, username: cleanUsername })
        setShowLogin(false)
        setUsername('')
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
          {currentUser.username?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
            {currentUser.username || currentUser.email}
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
        gap: '1.5rem',
        padding: '2.5rem',
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--bg) 100%)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        maxWidth: '420px',
        margin: '0 auto',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative gradient overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #1a73e8, #34a853, #fbbc04, #ea4335)',
          borderRadius: '16px 16px 0 0'
        }} />
        
        {/* Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          background: 'linear-gradient(135deg, #1a73e8, #4285f4)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '0.5rem'
        }}>
          <span style={{
            fontSize: '32px',
            color: 'white',
            fontWeight: '300'
          }}>🔐</span>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ 
            margin: '0 0 0.5rem 0', 
            color: 'var(--text)',
            fontSize: '24px',
            fontWeight: '600',
            letterSpacing: '-0.5px'
          }}>
            Welcome Back
          </h2>
          <p style={{ 
            margin: 0, 
            color: 'var(--muted)', 
            textAlign: 'center',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            Sign in to access your personalized search experiments and sync across devices
          </p>
        </div>
        
        <button
          onClick={() => setShowLogin(true)}
          style={{
            padding: '1rem 2rem',
            background: 'linear-gradient(135deg, #1a73e8, #4285f4)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            width: '100%',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 6px 20px rgba(26, 115, 232, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 12px rgba(26, 115, 232, 0.3)'
          }}
        >
          Get Started
        </button>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '12px',
          color: 'var(--muted)',
          width: '100%'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>
        
        <div style={{
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--muted)'
        }}>
          Continue without account to use locally only
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.5rem',
      padding: '2.5rem',
      background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--bg) 100%)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      maxWidth: '420px',
      margin: '0 auto',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #1a73e8, #34a853, #fbbc04, #ea4335)',
        borderRadius: '16px 16px 0 0'
      }} />
      
      {/* Header */}
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{
          width: '48px',
          height: '48px',
          background: 'linear-gradient(135deg, #1a73e8, #4285f4)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem auto'
        }}>
          <span style={{
            fontSize: '24px',
            color: 'white',
            fontWeight: '300'
          }}>👤</span>
        </div>
        
        <h2 style={{ 
          margin: '0 0 0.5rem 0', 
          color: 'var(--text)',
          fontSize: '22px',
          fontWeight: '600',
          letterSpacing: '-0.5px'
        }}>
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>
        <p style={{ 
          margin: 0, 
          color: 'var(--muted)', 
          fontSize: '14px',
          lineHeight: '1.4'
        }}>
          {isSignUp 
            ? 'Choose a username to get started with cloud sync'
            : 'Welcome back! Sign in to sync your data'
          }
        </p>
      </div>
      
      {error && (
        <div style={{
          padding: '1rem',
          background: 'linear-gradient(135deg, #fee, #fdd)',
          border: '1px solid #fcc',
          borderRadius: '12px',
          color: '#c00',
          fontSize: '14px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={{ 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.25rem' 
      }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontSize: '14px', 
            color: 'var(--text)',
            fontWeight: '500'
          }}>
            Username
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
              fontSize: '18px'
            }}>👤</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{
                width: '100%',
                padding: '1rem 1rem 1rem 3rem',
                border: '2px solid var(--border)',
                borderRadius: '12px',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1a73e8'
                e.target.style.boxShadow = '0 0 0 3px rgba(26, 115, 232, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)'
                e.target.style.boxShadow = 'none'
              }}
              required
            />
          </div>
        </div>
        
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontSize: '14px', 
            color: 'var(--text)',
            fontWeight: '500'
          }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
              fontSize: '18px'
            }}>🔒</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '1rem 1rem 1rem 3rem',
                border: '2px solid var(--border)',
                borderRadius: '12px',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1a73e8'
                e.target.style.boxShadow = '0 0 0 3px rgba(26, 115, 232, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)'
                e.target.style.boxShadow = 'none'
              }}
              required
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '1rem',
            background: loading 
              ? 'linear-gradient(135deg, #ccc, #999)' 
              : 'linear-gradient(135deg, #1a73e8, #4285f4)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            boxShadow: loading 
              ? 'none' 
              : '0 4px 12px rgba(26, 115, 232, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 6px 20px rgba(26, 115, 232, 0.4)'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 12px rgba(26, 115, 232, 0.3)'
            }
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span style={{ 
                display: 'inline-block',
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></span>
              Please wait...
            </span>
          ) : (
            isSignUp ? 'Create Account' : 'Sign In'
          )}
        </button>
      </form>
      
      {/* Toggle between sign in/up */}
      <div style={{
        textAlign: 'center',
        fontSize: '14px',
        color: 'var(--muted)',
        width: '100%'
      }}>
        <button
          type="button"
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
            fontWeight: '500',
            textDecoration: 'underline',
            textDecorationStyle: 'dotted'
          }}
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
      
      {/* Back button */}
      <button
        onClick={() => {
          setShowLogin(false)
          setError('')
          setIsSignUp(false)
          setUsername('')
          setPassword('')
        }}
        style={{
          background: 'none',
          border: '1px solid var(--border)',
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: '14px',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          transition: 'all 0.2s ease',
          width: '100%'
        }}
        onMouseEnter={(e) => {
          e.target.style.borderColor = 'var(--text)'
          e.target.style.color = 'var(--text)'
        }}
        onMouseLeave={(e) => {
          e.target.style.borderColor = 'var(--border)'
          e.target.style.color = 'var(--muted)'
        }}
      >
        ← Back
      </button>
      
      {/* Add CSS animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
