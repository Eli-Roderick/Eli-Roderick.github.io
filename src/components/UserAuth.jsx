import React, { useState, useEffect } from 'react'
import { signInWithEmail, signUpWithoutConfirmation, getCurrentUser, updateUser, signOut } from '../utils/supabase'

export default function UserAuth({ currentUser, onLogin, onLogout }) {
  const [showLogin, setShowLogin] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showProfile, setShowProfile] = useState(false)

  // Force close profile popup on mount
  useEffect(() => {
    setShowProfile(false)
  }, [])

  // Add ESC key listener to close profile popup
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowProfile(false)
      }
    }
    
    if (showProfile) {
      console.log('showProfile changed to true, adding ESC listener')
      window.addEventListener('keydown', handleEsc)
      return () => window.removeEventListener('keydown', handleEsc)
    }
  }, [showProfile])

  // Debug showProfile changes
  useEffect(() => {
    console.log('showProfile state changed:', showProfile)
  }, [showProfile])

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await getCurrentUser()
        if (user) {
          // Extract username from user metadata, fallback to email prefix
          const username = user.user_metadata?.username || 
                          user.user_metadata?.display_name || 
                          user.email?.split('@')[0] || 
                          'user'
          onLogin(username)
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
      setError('Please enter email and password')
      return
    }

    const email = username.trim().toLowerCase()
    const cleanPassword = password.trim()
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    // For sign up, verify passwords match
    if (isSignUp) {
      if (cleanPassword.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      if (cleanPassword !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      let result
      if (isSignUp) {
        console.log('Attempting signup for:', email)
        result = await signUpWithoutConfirmation(email, cleanPassword)
        console.log('Signup result:', result)
      } else {
        console.log('Attempting signin for:', email)
        result = await signInWithEmail(email, cleanPassword)
        console.log('Signin result:', result)
      }

      if (result.error) {
        // Special handling for email confirmation error
        if (result.error.message.includes('Email not confirmed')) {
          setError('Account requires email confirmation. Try creating a new account with the same email.')
        } else {
          setError(result.error.message)
        }
        return
      }

      if (result.data.user) {
        // Store email as the display name
        const { updateUser } = await import('../utils/supabase')
        await updateUser({ 
          data: { 
            display_name: email,
            username: email 
          } 
        })
        
        // Login successful - pass the email as username
        onLogin(email)
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
    // If user is already a string, use it directly; otherwise extract username
    const username = typeof user === 'string' 
      ? user 
      : (user.user_metadata?.username || user.user_metadata?.display_name || user.email?.split('@')[0] || 'user')
    onLogin(username)
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.warn('Supabase signOut error:', error)
    }
    onLogout()
    setShowLogin(true)
  }

  if (currentUser) {
    return (
      <>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          position: 'relative',
          zIndex: 1
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
            {typeof currentUser === 'string' 
              ? currentUser.charAt(0).toUpperCase() 
              : (currentUser.username?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase() || 'U')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
              {typeof currentUser === 'string' ? currentUser : (currentUser.username || currentUser.email)}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Switch User clicked - calling handleLogout')
                handleLogout()
              }}
              style={{
                fontSize: '12px',
                color: 'var(--muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                padding: 0,
                position: 'relative',
                zIndex: 2
              }}
            >
              Switch User
            </button>
          </div>
        </div>
        
        {/* Debug force close button */}
        {showProfile && (
          <button
            onClick={() => {
              console.log('Force closing profile popup')
              setShowProfile(false)
            }}
            style={{
              position: 'fixed',
              top: '10px',
              left: '10px',
              zIndex: 1000001,
              backgroundColor: 'red',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '5px',
              fontSize: '12px'
            }}
          >
            FORCE CLOSE
          </button>
        )}
      </>
    )
  }

  if (!showLogin) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem',
        padding: '3rem 4rem',
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--bg) 100%)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        maxWidth: '600px',
        width: '90%',
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
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #1a73e8, #4285f4)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem'
        }}>
          <span style={{
            fontSize: '40px',
            color: 'white',
            fontWeight: '300'
          }}>🔐</span>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ 
            margin: '0 0 0.75rem 0', 
            color: 'var(--text)',
            fontSize: '28px',
            fontWeight: '600',
            letterSpacing: '-0.5px'
          }}>
            Welcome Back
          </h2>
          <p style={{ 
            margin: 0, 
            color: 'var(--muted)', 
            textAlign: 'center',
            fontSize: '16px',
            lineHeight: '1.5'
          }}>
            Sign in to access your personalized search experiments and sync across devices
          </p>
        </div>
        
        <button
          onClick={() => setShowLogin(true)}
          style={{
            padding: '1.25rem 3rem',
            background: 'linear-gradient(135deg, #1a73e8, #4285f4)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '18px',
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
          gap: '1.5rem',
          fontSize: '14px',
          color: 'var(--muted)',
          width: '100%'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>
        
        <div style={{
          textAlign: 'center',
          fontSize: '15px',
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
      padding: '2.5rem 3rem',
      background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--bg) 100%)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      maxWidth: '600px',
      width: '90%',
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
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, #1a73e8, #4285f4)',
          borderRadius: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem auto'
        }}>
          <span style={{
            fontSize: '30px',
            color: 'white',
            fontWeight: '300'
          }}>👤</span>
        </div>
        
        <h2 style={{ 
          margin: '0 0 0.75rem 0', 
          color: 'var(--text)',
          fontSize: '26px',
          fontWeight: '600',
          letterSpacing: '-0.5px'
        }}>
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>
        <p style={{ 
          margin: 0, 
          color: 'var(--muted)', 
          fontSize: '16px',
          lineHeight: '1.4'
        }}>
          {isSignUp 
            ? 'Enter your email to create an account'
            : 'Welcome back! Sign in to sync your data'
          }
        </p>
      </div>
      
      {error && (
        <div style={{
          padding: '1rem 1.5rem',
          background: 'linear-gradient(135deg, #fee, #fdd)',
          border: '1px solid #fcc',
          borderRadius: '12px',
          color: '#c00',
          fontSize: '15px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={{ 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem' 
      }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.75rem', 
            fontSize: '15px', 
            color: 'var(--text)',
            fontWeight: '600'
          }}>
            Email
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '1.2rem'
            }}>📧</span>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your email"
              style={{
                width: '100%',
                padding: '1rem 1rem 1rem 3rem',
                border: '2px solid var(--border)',
                borderRadius: '12px',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '16px',
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
            marginBottom: '0.75rem', 
            fontSize: '15px', 
            color: 'var(--text)',
            fontWeight: '600'
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
              fontSize: '20px'
            }}>🔒</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '1rem 3rem 1rem 3rem',
                border: '2px solid var(--border)',
                borderRadius: '12px',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '16px',
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
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: 'var(--muted)',
                padding: '0.25rem'
              }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {/* Confirm Password - only for sign up */}
        {isSignUp && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text)',
              marginLeft: '0.25rem'
            }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
                fontSize: '20px'
              }}>🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  border: '2px solid var(--border)',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '16px',
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
        )}
        
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '1.25rem',
            background: loading 
              ? 'linear-gradient(135deg, #ccc, #999)' 
              : 'linear-gradient(135deg, #1a73e8, #4285f4)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '18px',
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
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <span style={{ 
                display: 'inline-block',
                width: '18px',
                height: '18px',
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
        fontSize: '15px',
        color: 'var(--muted)',
        width: '100%'
      }}>
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp)
            setError('')
            setConfirmPassword('')
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#1a73e8',
            cursor: 'pointer',
            fontSize: '15px',
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
          setConfirmPassword('')
        }}
        style={{
          background: 'none',
          border: '1px solid var(--border)',
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: '15px',
          padding: '1rem 2rem',
          borderRadius: '10px',
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
