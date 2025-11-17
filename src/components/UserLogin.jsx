import React, { useState, useEffect } from 'react'

export default function UserLogin({ onLogin, currentUser, onLogout }) {
  const [username, setUsername] = useState('')
  const [showLogin, setShowLogin] = useState(!currentUser)
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

  const handleLogin = (user) => {
    if (!user || user.trim().length === 0) return
    
    const trimmedUser = user.trim()
    
    // Add to recent users (keep last 5)
    const updatedRecent = [
      trimmedUser,
      ...recentUsers.filter(u => u !== trimmedUser)
    ].slice(0, 5)
    
    setRecentUsers(updatedRecent)
    
    try {
      localStorage.setItem('recent_users', JSON.stringify(updatedRecent))
      localStorage.setItem('current_user', trimmedUser)
    } catch (error) {
      console.warn('Failed to save user data:', error)
    }
    
    onLogin(trimmedUser)
    setShowLogin(false)
    setUsername('')
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem('current_user')
    } catch (error) {
      console.warn('Failed to clear user data:', error)
    }
    onLogout()
    setShowLogin(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    handleLogin(username)
  }

  if (!showLogin && currentUser) {
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
        <span style={{ color: 'var(--text)', fontWeight: '500' }}>{currentUser}</span>
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
          title="Switch user"
        >
          Switch
        </button>
      </div>
    )
  }

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
          Enter User ID
        </h2>
        
        <p style={{
          margin: '0 0 1.5rem 0',
          fontSize: '14px',
          color: 'var(--muted)',
          textAlign: 'center',
          lineHeight: '1.4'
        }}>
          Enter any username to access your personalized data across devices. 
          No password required - this is for research purposes only.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username (e.g., participant-001)"
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
          />
          
          <button
            type="submit"
            disabled={!username.trim()}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: username.trim() ? '#1a73e8' : 'var(--border)',
              color: username.trim() ? 'white' : 'var(--muted)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: username.trim() ? 'pointer' : 'not-allowed',
              marginBottom: '1rem'
            }}
          >
            Continue
          </button>
        </form>

        {recentUsers.length > 0 && (
          <div>
            <p style={{
              margin: '0 0 0.5rem 0',
              fontSize: '12px',
              color: 'var(--muted)',
              fontWeight: '500'
            }}>
              Recent Users:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {recentUsers.map(user => (
                <button
                  key={user}
                  onClick={() => handleLogin(user)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: 'var(--text)',
                    cursor: 'pointer'
                  }}
                >
                  {user}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
