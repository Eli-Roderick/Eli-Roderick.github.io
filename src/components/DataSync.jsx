import React, { useState } from 'react'

export default function DataSync({ currentUser, onImportData, onExportData }) {
  const [showSync, setShowSync] = useState(false)
  const [shareCode, setShareCode] = useState('')
  const [importCode, setImportCode] = useState('')
  const [exportedCode, setExportedCode] = useState('')

  const handleExport = () => {
    const code = onExportData()
    setExportedCode(code)
  }

  const handleImport = () => {
    if (importCode.trim()) {
      const success = onImportData(importCode.trim())
      if (success) {
        alert('Data imported successfully! Your pages and settings are now synced.')
        setImportCode('')
        setShowSync(false)
      } else {
        alert('Invalid sync code. Please check the code and try again.')
      }
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Sync code copied to clipboard!')
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Sync code copied to clipboard!')
    })
  }

  if (!showSync) {
    return (
      <button
        onClick={() => setShowSync(true)}
        style={{
          padding: '0.5rem 0.75rem',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          fontSize: '12px',
          color: 'var(--text)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
        title="Sync data across devices"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>sync</span>
        Sync Devices
      </button>
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
        maxWidth: '500px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--text)'
          }}>
            Sync Data Across Devices
          </h2>
          <button
            onClick={() => setShowSync(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'var(--muted)'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text)' }}>
            Export Data from This Device
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
            Generate a sync code to transfer your pages and settings to another device.
          </p>
          <button
            onClick={handleExport}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            Generate Sync Code
          </button>
          
          {exportedCode && (
            <div>
              <div style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '0.75rem',
                fontSize: '12px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                marginBottom: '0.5rem',
                maxHeight: '100px',
                overflow: 'auto'
              }}>
                {exportedCode}
              </div>
              <button
                onClick={() => copyToClipboard(exportedCode)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  color: 'var(--text)'
                }}
              >
                Copy Sync Code
              </button>
            </div>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text)' }}>
            Import Data to This Device
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
            Paste a sync code from another device to import your pages and settings.
          </p>
          <textarea
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
            placeholder="Paste sync code here..."
            style={{
              width: '100%',
              height: '80px',
              padding: '0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text)',
              fontSize: '12px',
              fontFamily: 'monospace',
              resize: 'vertical',
              marginBottom: '1rem'
            }}
          />
          <button
            onClick={handleImport}
            disabled={!importCode.trim()}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: importCode.trim() ? '#1a73e8' : 'var(--border)',
              color: importCode.trim() ? 'white' : 'var(--muted)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: importCode.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Import Data
          </button>
        </div>

        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: 'var(--bg)',
          borderRadius: '6px',
          fontSize: '12px',
          color: 'var(--muted)',
          lineHeight: '1.4'
        }}>
          <strong>How it works:</strong><br/>
          1. On your computer: Click "Generate Sync Code" and copy it<br/>
          2. On your phone: Paste the code and click "Import Data"<br/>
          3. Your custom pages and settings will appear on both devices
        </div>
      </div>
    </div>
  )
}
