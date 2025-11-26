import React, { useState } from 'react'
import { supabase } from '../utils/supabase'

export default function SupabaseTestButton() {
  const [status, setStatus] = useState('Ready to test')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setStatus('Testing connection...')
    
    try {
      // Test basic connection
      const { data, error } = await supabase.from('user_profiles').select('count').limit(1)
      
      if (error) {
        setStatus(`❌ Error: ${error.message}`)
      } else {
        setStatus('✅ Supabase connected successfully!')
      }
    } catch (err) {
      setStatus(`❌ Connection failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      border: '2px solid #1a73e8',
      borderRadius: '8px',
      padding: '15px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#1a73e8' }}>🧪 Supabase Test</h4>
      
      <div style={{ 
        marginBottom: '10px', 
        fontSize: '14px',
        color: '#333'
      }}>
        {status}
      </div>
      
      <button
        onClick={testConnection}
        disabled={loading}
        style={{
          width: '100%',
          padding: '8px 16px',
          backgroundColor: loading ? '#ccc' : '#1a73e8',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px'
        }}
      >
        {loading ? 'Testing...' : 'Test Connection'}
      </button>

      <div style={{
        marginTop: '10px',
        fontSize: '12px',
        color: '#666'
      }}>
        <div>URL: {process.env.REACT_APP_SUPABASE_URL ? '✅' : '❌'}</div>
        <div>Key: {process.env.REACT_APP_SUPABASE_ANON_KEY ? '✅' : '❌'}</div>
      </div>
    </div>
  )
}
