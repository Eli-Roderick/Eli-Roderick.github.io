import React, { useState, useEffect } from 'react'

export default function UserAuth({ currentUser, onLogin, onLogout }) {
  const [showLogin, setShowLogin] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [recentUsers, setRecentUsers] = useState([])

  // Load recent users from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recent_users')
      if (saved) {
        setRecentUsers(JSON.parse(saved))
      }
    } catch (error) {
      console.warn('Failed to load recent users:', error)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!username.trim()) {
      alert('Please enter a username')
      return
    }

    if (!password.trim()) {
      alert('Please enter a password')
      return
    }

    try {
      // For now, we'll use a simple username/password system
      // In the future, this could be upgraded to proper Supabase auth
      
      const userCredentials = {
        username: username.trim().toLowerCase(),
        password: password.trim()
      }

      // Store/verify credentials in localStorage (temporary solution)
      const storedUsers = JSON.parse(localStorage.getItem('user_credentials') || '{}')
      
      if (isSignUp) {
        // Sign up - check if user already exists
        if (storedUsers[userCredentials.username]) {
          alert('Username already exists. Please choose a different username or sign in.')
          return
        }
        
        // Create new user
        storedUsers[userCredentials.username] = {
          password: userCredentials.password,
          createdAt: new Date().toISOString()
        }
        localStorage.setItem('user_credentials', JSON.stringify(storedUsers))
        
        alert('Account created successfully! You are now logged in.')
      } else {
        // Sign in - verify credentials
        const storedUser = storedUsers[userCredentials.username]
        if (!storedUser || storedUser.password !== userCredentials.password) {
          alert('Invalid username or password')
          return
        }
      }

      // Add to recent users
      const updatedRecent = [
        userCredentials.username,
        ...recentUsers.filter(u => u !== userCredentials.username)
      ].slice(0, 5)
      
      setRecentUsers(updatedRecent)
      localStorage.setItem('recent_users', JSON.stringify(updatedRecent))

      // Login successful
      onLogin(userCredentials.username)
      setShowLogin(false)
      setUsername('')
      setPassword('')
      
    } catch (error) {
      console.error('Authentication error:', error)
      alert('Authentication failed. Please try again.')
    }
  }

  const handleQuickLogin = (user) => {
    setUsername(user)
    setShowLogin(true)
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
          {currentUser.charAt(0).toUpperCase()}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
            {currentUser}
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
        
        {recentUsers.length > 0 && (
          <div style={{ width: '100%' }}>
            <h3 style={{ fontSize: '14px', margin: '0 0 0.5rem 0', color: 'var(--text)' }}>
              Recent Users:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentUsers.map(user => (
                <button
                  key={user}
                  onClick={() => handleQuickLogin(user)}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: '#1a73e8',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {user.charAt(0).toUpperCase()}
                  </div>
                  {user}
                </button>
              ))}
            </div>
          </div>
        )}
        
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
        {isSignUp ? 'Create Account' : 'Sign In'}
      </h2>
      
      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: 'var(--text)' }}>
            Username:
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
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
          style={{
            padding: '0.75rem',
            backgroundColor: '#1a73e8',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {isSignUp ? 'Create Account' : 'Sign In'}
        </button>
      </form>
      
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            fontSize: '14px',
            textDecoration: 'underline'
          }}
        >
          {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
        </button>
      </div>
      
      <button
        onClick={() => setShowLogin(false)}
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
