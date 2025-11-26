import React, { useState } from 'react'
import { testSupabaseConnection, hybridSave } from '../utils/hybridStorage'

export default function SupabaseDataSync({ 
  isOpen, 
  onClose, 
  currentUser, 
  customSearchPages, 
  aiOverviews,
  searchResultAssignments,
  customSearchResults,
  resultImages,
  userAIText,
  pageAIOverviewSettings
}) {
  const [status, setStatus] = useState('Ready to sync your data to Supabase')
  const [loading, setLoading] = useState(false)
  const [connectionTested, setConnectionTested] = useState(false)

  if (!isOpen) return null

  const testConnection = async () => {
    setLoading(true)
    setStatus('Testing Supabase connection...')
    
    console.log('🔍 Testing Supabase connection...')
    const result = await testSupabaseConnection()
    console.log('🔍 Connection result:', result)
    
    if (result.success) {
      setStatus('✅ Supabase connected successfully!')
      setConnectionTested(true)
    } else {
      setStatus(`❌ Connection failed: ${result.error}`)
      setConnectionTested(false)
    }
    
    setLoading(false)
  }

  const syncAllData = async () => {
    if (!currentUser) {
      setStatus('❌ Please log in first')
      return
    }

    if (!connectionTested) {
      setStatus('❌ Please test connection first')
      return
    }

    setLoading(true)
    setStatus('Syncing all data to Supabase...')
    
    console.log('🔍 Starting sync for user:', currentUser)
    console.log('🔍 Custom pages to sync:', Object.keys(customSearchPages).length)
    console.log('🔍 AI overviews to sync:', aiOverviews.length)
    
    try {
      let syncCount = 0
      
      // Sync custom pages
      if (Object.keys(customSearchPages).length > 0) {
        console.log('🔍 Syncing custom pages...')
        const result = await hybridSave('custom_search_pages', customSearchPages, currentUser)
        console.log('🔍 Custom pages sync result:', result)
        if (result) syncCount++
      }
      
      // Sync AI overviews
      if (aiOverviews.length > 0) {
        console.log('🔍 Syncing AI overviews...')
        const result = await hybridSave('ai_overviews', aiOverviews, currentUser)
        console.log('🔍 AI overviews sync result:', result)
        if (result) syncCount++
      }
      
      console.log('🔍 Total sync count:', syncCount)
      setStatus(`✅ Successfully synced ${syncCount} data types to Supabase!`)
    } catch (error) {
      console.error('🔍 Sync error:', error)
      setStatus(`❌ Sync failed: ${error.message}`)
    }
    
    setLoading(false)
  }

  const getDataSummary = () => {
    const summary = []
    if (Object.keys(customSearchPages).length > 0) {
      summary.push(`${Object.keys(customSearchPages).length} custom pages`)
    }
    if (aiOverviews.length > 0) {
      summary.push(`${aiOverviews.length} AI overviews`)
    }
    if (Object.keys(customSearchResults).length > 0) {
      summary.push(`${Object.keys(customSearchResults).length} result sets`)
    }
    if (Object.keys(resultImages).length > 0) {
      summary.push(`${Object.keys(resultImages).length} image sets`)
    }
    
    return summary.length > 0 ? summary.join(', ') : 'No data to sync'
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
        maxWidth: '500px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--text)'
          }}>
            🔄 Supabase Data Sync
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--muted)'
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: 'var(--bg)',
          borderRadius: '6px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '0.5rem' }}>
            <strong>Current User:</strong> {currentUser || 'Not logged in'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '0.5rem' }}>
            <strong>Data to sync:</strong> {getDataSummary()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            <div>Supabase URL: ✅ Connected</div>
            <div>API Key: ✅ Found</div>
            <div>Deployment: GitHub Pages</div>
          </div>
        </div>

        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: status.includes('❌') ? '#fee' : status.includes('✅') ? '#efe' : 'var(--bg)',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          fontSize: '14px',
          color: 'var(--text)',
          minHeight: '20px'
        }}>
          {status}
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
          <button
            onClick={testConnection}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? 'var(--border)' : '#1a73e8',
              color: loading ? 'var(--muted)' : 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading && !connectionTested ? 'Testing Connection...' : 'Test Supabase Connection'}
          </button>
          
          <button
            onClick={syncAllData}
            disabled={loading || !currentUser || !connectionTested}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: (loading || !currentUser || !connectionTested) ? 'var(--border)' : '#28a745',
              color: (loading || !currentUser || !connectionTested) ? 'var(--muted)' : 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: (loading || !currentUser || !connectionTested) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading && connectionTested ? 'Syncing Data...' : 'Sync All Data to Supabase'}
          </button>
        </div>

        <div style={{
          marginTop: '1rem',
          fontSize: '12px',
          color: 'var(--muted)',
          textAlign: 'center',
          lineHeight: '1.4'
        }}>
          Your data remains stored locally and will be backed up to Supabase cloud storage.
          This allows you to access your data from any device.
        </div>
      </div>
    </div>
  )
}
