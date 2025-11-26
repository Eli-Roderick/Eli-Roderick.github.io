import React, { useState } from 'react'
import { testSupabaseConnection, hybridSave } from '../utils/hybridStorage'

export default function SupabaseSync({ currentUser, customSearchPages, aiOverviews }) {
  const [status, setStatus] = useState('Ready')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setStatus('Testing connection...')
    
    const result = await testSupabaseConnection()
    
    if (result.success) {
      setStatus('✅ Supabase connected!')
    } else {
      setStatus(`❌ Error: ${result.error}`)
    }
    
    setLoading(false)
  }

  const syncCustomPages = async () => {
    if (!currentUser) {
      setStatus('❌ Please log in first')
      return
    }

    setLoading(true)
    setStatus('Syncing custom pages...')
    
    try {
      const success = await hybridSave('custom_search_pages', customSearchPages, currentUser)
      if (success) {
        setStatus(`✅ Synced ${Object.keys(customSearchPages).length} custom pages`)
      } else {
        setStatus('❌ Failed to sync custom pages')
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`)
    }
    
    setLoading(false)
  }

  const syncAIOverviews = async () => {
    if (!currentUser) {
      setStatus('❌ Please log in first')
      return
    }

    setLoading(true)
    setStatus('Syncing AI overviews...')
    
    try {
      const success = await hybridSave('ai_overviews', aiOverviews, currentUser)
      if (success) {
        setStatus(`✅ Synced ${aiOverviews.length} AI overviews`)
      } else {
        setStatus('❌ Failed to sync AI overviews')
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`)
    }
    
    setLoading(false)
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
      <h4 style={{ margin: '0 0 10px 0', color: '#1a73e8' }}>🔄 Supabase Sync</h4>
      
      <div style={{ 
        marginBottom: '10px', 
        fontSize: '12px',
        color: '#333',
        minHeight: '20px'
      }}>
        {status}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={testConnection}
          disabled={loading}
          style={{
            padding: '6px 12px',
            backgroundColor: loading ? '#ccc' : '#1a73e8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          Test Connection
        </button>
        
        <button
          onClick={syncCustomPages}
          disabled={loading || !currentUser}
          style={{
            padding: '6px 12px',
            backgroundColor: (loading || !currentUser) ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (loading || !currentUser) ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          Sync Pages ({Object.keys(customSearchPages).length})
        </button>
        
        <button
          onClick={syncAIOverviews}
          disabled={loading || !currentUser}
          style={{
            padding: '6px 12px',
            backgroundColor: (loading || !currentUser) ? '#ccc' : '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (loading || !currentUser) ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          Sync AI ({aiOverviews.length})
        </button>
      </div>

      <div style={{
        marginTop: '10px',
        fontSize: '11px',
        color: '#666'
      }}>
        <div>User: {currentUser || 'Not logged in'}</div>
        <div>Env: {process.env.REACT_APP_SUPABASE_URL ? '✅' : '❌'}</div>
      </div>
    </div>
  )
}
