import React, { useState, useEffect } from 'react'
import { onSaveStatusChange } from '../utils/autoSave'

export default function SavingIndicator() {
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onSaveStatusChange(setIsSaving)
    return unsubscribe
  }, [])

  if (!isSaving) return null

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      padding: '8px 12px',
      fontSize: '12px',
      color: 'var(--text)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }}>
      <div style={{
        width: '12px',
        height: '12px',
        border: '2px solid var(--border)',
        borderTop: '2px solid var(--text)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      Saving...
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
