import React, { useState, useEffect } from 'react'
import { supabase, getCurrentUser } from '../utils/supabase'

export default function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState('Testing...')
  const [user, setUser] = useState(null)
  const [testEmail, setTestEmail] = useState('')
  const [testPassword, setTestPassword] = useState('')

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      // Test basic connection
      const { data, error } = await supabase.from('user_profiles').select('count').limit(1)
      
      if (error) {
        setConnectionStatus(`❌ Connection failed: ${error.message}`)
      } else {
        setConnectionStatus('✅ Connected to Supabase successfully!')
        
        // Check if user is already logged in
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      }
    } catch (err) {
      setConnectionStatus(`❌ Error: ${err.message}`)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    if (!testEmail || !testPassword) return

    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    })

    if (error) {
      alert(`Sign up error: ${error.message}`)
    } else {
      alert('Sign up successful! Check your email for confirmation.')
      setUser(data.user)
    }
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    if (!testEmail || !testPassword) return

    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    if (error) {
      alert(`Sign in error: ${error.message}`)
    } else {
      alert('Signed in successfully!')
      setUser(data.user)
    }
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      alert(`Sign out error: ${error.message}`)
    } else {
      alert('Signed out successfully!')
      setUser(null)
    }
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '2px solid #333', 
      padding: '20px', 
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      zIndex: 9999,
      maxWidth: '400px'
    }}>
      <h3>🧪 Supabase Test Panel</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Connection Status:</strong><br />
        {connectionStatus}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Current User:</strong><br />
        {user ? `✅ ${user.email} (ID: ${user.id.slice(0, 8)}...)` : '❌ Not logged in'}
      </div>

      {!user ? (
        <form onSubmit={handleSignIn} style={{ marginBottom: '10px' }}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="email"
              placeholder="Email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <button type="submit" style={{ marginRight: '10px', padding: '8px 16px' }}>
            Sign In
          </button>
          <button type="button" onClick={handleSignUp} style={{ padding: '8px 16px' }}>
            Sign Up
          </button>
        </form>
      ) : (
        <button onClick={handleSignOut} style={{ padding: '8px 16px' }}>
          Sign Out
        </button>
      )}

      <div style={{ fontSize: '12px', color: '#666', marginTop: '15px' }}>
        <strong>Environment Check:</strong><br />
        URL: {process.env.REACT_APP_SUPABASE_URL ? '✅' : '❌'}<br />
        Key: {process.env.REACT_APP_SUPABASE_ANON_KEY ? '✅' : '❌'}
      </div>
    </div>
  )
}
