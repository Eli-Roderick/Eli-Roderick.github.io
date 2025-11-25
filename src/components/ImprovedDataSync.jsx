import React, { useState } from 'react'
import { syncMethods } from '../utils/betterSync'

export default function ImprovedDataSync({ currentUser, onImportData, onExportData, onClose }) {
  const [activeMethod, setActiveMethod] = useState('url')
  const [shareUrl, setShareUrl] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [compressedCode, setCompressedCode] = useState('')
  const [importCode, setImportCode] = useState('')
  const [loading, setLoading] = useState(false)

  const methods = [
    { id: 'url', name: 'Share URL', icon: 'link', description: 'Create a short shareable link (recommended)' },
    { id: 'compressed', name: 'Compressed Code', icon: 'compress', description: 'Smaller sync code using compression' },
    { id: 'original', name: 'Original Method', icon: 'code', description: 'Full sync code (very long)' }
  ]

  const handleUrlExport = async () => {
    setLoading(true)
    try {
      const data = onExportData()
      if (!data) {
        alert('No data to export')
        return
      }

      // Parse the original data
      const decoded = atob(data)
      const uint8Array = new Uint8Array(decoded.length)
      for (let i = 0; i < decoded.length; i++) {
        uint8Array[i] = decoded.charCodeAt(i)
      }
      const jsonString = new TextDecoder().decode(uint8Array)
      const exportData = JSON.parse(jsonString)

      // Create GitHub Gist
      const shareId = await syncMethods.gist.createShareLink(currentUser, exportData.data)
      
      if (shareId) {
        const shareableUrl = `${window.location.origin}${window.location.pathname}?sync=${shareId}`
        setShareUrl(shareableUrl)
        alert('Share URL created! Copy the URL below to sync on another device.')
      } else {
        alert('Failed to create share URL. Try the compressed code method instead.')
      }
    } catch (error) {
      console.error('URL export failed:', error)
      alert('Failed to create share URL: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUrlImport = async () => {
    if (!importUrl.trim()) return
    
    setLoading(true)
    try {
      // Extract share ID from URL
      const url = new URL(importUrl)
      const shareId = url.searchParams.get('sync')
      
      if (!shareId) {
        alert('Invalid share URL. Make sure you copied the complete URL.')
        return
      }

      // Load data from GitHub Gist
      const importData = await syncMethods.gist.loadFromShareLink(shareId)
      
      if (importData && importData.data) {
        // Convert to the format expected by onImportData
        const encoded = btoa(JSON.stringify(importData))
        const success = onImportData(encoded)
        
        if (success) {
          alert('Data imported successfully from share URL!')
          setImportUrl('')
          onClose && onClose()
        } else {
          alert('Failed to import data. Please try again.')
        }
      } else {
        alert('No data found at this URL. Please check the URL and try again.')
      }
    } catch (error) {
      console.error('URL import failed:', error)
      alert('Failed to import from URL: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCompressedExport = async () => {
    setLoading(true)
    try {
      const data = onExportData()
      if (!data) {
        alert('No data to export')
        return
      }

      // Parse the original data
      const decoded = atob(data)
      const uint8Array = new Uint8Array(decoded.length)
      for (let i = 0; i < decoded.length; i++) {
        uint8Array[i] = decoded.charCodeAt(i)
      }
      const jsonString = new TextDecoder().decode(uint8Array)
      const exportData = JSON.parse(jsonString)

      // Compress the data
      const compressed = await syncMethods.compressed.compress(exportData)
      
      if (compressed) {
        setCompressedCode(compressed)
        alert(`Compressed sync code generated! Size reduced by ~${Math.round((1 - compressed.length / data.length) * 100)}%`)
      } else {
        alert('Compression failed. Try the original method instead.')
      }
    } catch (error) {
      console.error('Compression failed:', error)
      alert('Failed to compress data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCompressedImport = async () => {
    if (!importCode.trim()) return
    
    try {
      const decompressed = await syncMethods.compressed.decompress(importCode.trim())
      
      if (decompressed) {
        const importData = JSON.parse(decompressed)
        const encoded = btoa(JSON.stringify(importData))
        const success = onImportData(encoded)
        
        if (success) {
          alert('Compressed data imported successfully!')
          setImportCode('')
          onClose && onClose()
        } else {
          alert('Failed to import compressed data.')
        }
      } else {
        alert('Failed to decompress sync code. Please check the code and try again.')
      }
    } catch (error) {
      console.error('Compressed import failed:', error)
      alert('Failed to import compressed data: ' + error.message)
    }
  }

  const handleOriginalExport = () => {
    const data = onExportData()
    if (data) {
      setCompressedCode(data)
      alert('Original sync code generated (warning: very long!)')
    }
  }

  const handleOriginalImport = () => {
    if (importCode.trim()) {
      const success = onImportData(importCode.trim())
      if (success) {
        alert('Data imported successfully!')
        setImportCode('')
        onClose && onClose()
      } else {
        alert('Invalid sync code. Please check the code and try again.')
      }
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!')
    }).catch(() => {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Copied to clipboard!')
    })
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
        maxWidth: '600px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        maxHeight: '90vh',
        overflow: 'auto'
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
            onClick={() => onClose && onClose()}
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

        {/* Method Selection */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
            Choose Sync Method:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {methods.map(method => (
              <label key={method.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                border: `2px solid ${activeMethod === method.id ? '#1a73e8' : 'var(--border)'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: activeMethod === method.id ? 'rgba(26, 115, 232, 0.1)' : 'var(--card-bg)'
              }}>
                <input
                  type="radio"
                  name="syncMethod"
                  value={method.id}
                  checked={activeMethod === method.id}
                  onChange={(e) => setActiveMethod(e.target.value)}
                  style={{ margin: 0 }}
                />
                <div>
                  <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>
                    {method.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {method.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* URL Method */}
        {activeMethod === 'url' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text)' }}>
                Export Data (Create Share URL)
              </h3>
              <button
                onClick={handleUrlExport}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: loading ? 'var(--border)' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginBottom: '1rem'
                }}
              >
                {loading ? 'Creating Share URL...' : 'Create Share URL'}
              </button>
              
              {shareUrl && (
                <div>
                  <div style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '0.75rem',
                    fontSize: '12px',
                    wordBreak: 'break-all',
                    marginBottom: '0.5rem'
                  }}>
                    {shareUrl}
                  </div>
                  <button
                    onClick={() => copyToClipboard(shareUrl)}
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
                    Copy Share URL
                  </button>
                </div>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text)' }}>
                Import Data (From Share URL)
              </h3>
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Paste share URL here..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text)',
                  fontSize: '12px',
                  marginBottom: '1rem'
                }}
              />
              <button
                onClick={handleUrlImport}
                disabled={!importUrl.trim() || loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: (importUrl.trim() && !loading) ? '#1a73e8' : 'var(--border)',
                  color: (importUrl.trim() && !loading) ? 'white' : 'var(--muted)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: (importUrl.trim() && !loading) ? 'pointer' : 'not-allowed'
                }}
              >
                {loading ? 'Importing...' : 'Import from URL'}
              </button>
            </div>
          </div>
        )}

        {/* Compressed Method */}
        {activeMethod === 'compressed' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text)' }}>
                Export Data (Compressed)
              </h3>
              <button
                onClick={handleCompressedExport}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: loading ? 'var(--border)' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginBottom: '1rem'
                }}
              >
                {loading ? 'Compressing...' : 'Generate Compressed Code'}
              </button>
              
              {compressedCode && (
                <div>
                  <div style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '0.75rem',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    marginBottom: '0.5rem',
                    maxHeight: '150px',
                    overflow: 'auto'
                  }}>
                    {compressedCode}
                  </div>
                  <button
                    onClick={() => copyToClipboard(compressedCode)}
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
                    Copy Compressed Code
                  </button>
                </div>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text)' }}>
                Import Compressed Data
              </h3>
              <textarea
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="Paste compressed sync code here..."
                style={{
                  width: '100%',
                  height: '100px',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text)',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  marginBottom: '1rem'
                }}
              />
              <button
                onClick={handleCompressedImport}
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
                Import Compressed Data
              </button>
            </div>
          </div>
        )}

        {/* Original Method */}
        {activeMethod === 'original' && (
          <div>
            <div style={{
              padding: '1rem',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '6px',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '12px', color: '#856404' }}>
                ⚠️ <strong>Warning:</strong> This method creates very long sync codes that may be difficult to copy/paste.
                Consider using the Share URL method instead.
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text)' }}>
                Export Data (Original Method)
              </h3>
              <button
                onClick={handleOriginalExport}
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
                Generate Full Sync Code
              </button>
              
              {compressedCode && (
                <div>
                  <div style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '0.75rem',
                    fontSize: '8px',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    marginBottom: '0.5rem',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {compressedCode}
                  </div>
                  <button
                    onClick={() => copyToClipboard(compressedCode)}
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
                    Copy Full Sync Code
                  </button>
                </div>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text)' }}>
                Import Full Sync Code
              </h3>
              <textarea
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="Paste full sync code here..."
                style={{
                  width: '100%',
                  height: '120px',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text)',
                  fontSize: '8px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  marginBottom: '1rem'
                }}
              />
              <button
                onClick={handleOriginalImport}
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
                Import Full Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
