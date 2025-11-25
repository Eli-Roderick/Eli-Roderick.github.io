import React, { useState, useEffect } from 'react'

export default function SimpleSupabaseTest() {
  const [status, setStatus] = useState('Loading...')

  useEffect(() => {
    // Simple test without importing Supabase
    const url = process.env.REACT_APP_SUPABASE_URL
    const key = process.env.REACT_APP_SUPABASE_ANON_KEY
    
    if (url && key) {
      setStatus('✅ Environment variables loaded!')
    } else {
      setStatus('❌ Environment variables missing')
    }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'red',
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      zIndex: 9999,
      fontSize: '16px',
      fontWeight: 'bold'
    }}>
      SUPABASE TEST: {status}
    </div>
  )
}
