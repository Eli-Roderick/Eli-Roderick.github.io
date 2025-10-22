import React, { useState } from 'react'

export default function ImageManager({ 
  isOpen, 
  onClose, 
  results = [], 
  resultImages = {}, 
  onImagesUpdate,
  onClearAll 
}) {
  const [selectedResult, setSelectedResult] = useState(null)
  const [imageUrls, setImageUrls] = useState('')

  const handleResultSelect = (result) => {
    setSelectedResult(result)
    const existingImages = resultImages[result.url] || []
    setImageUrls(existingImages.join('\n'))
  }

  const handleSaveImages = () => {
    if (!selectedResult) return
    
    const urls = imageUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)
    
    onImagesUpdate(selectedResult.url, urls)
    setSelectedResult(null)
    setImageUrls('')
  }

  const handleClearImages = () => {
    if (!selectedResult) return
    onImagesUpdate(selectedResult.url, [])
    setImageUrls('')
  }

  if (!isOpen) return null

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
    }} onClick={onClose}>
      <div style={{
        width: '90%',
        maxWidth: '600px',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            {selectedResult ? 'Edit Images' : 'Manage Images'}
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {selectedResult && (
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '16px',
                  cursor: 'pointer',
                  color: 'var(--muted)'
                }}
                onClick={() => {
                  setSelectedResult(null)
                  setImageUrls('')
                }}
              >
                ←
              </button>
            )}
            <button
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: 'var(--muted)'
              }}
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{
          padding: '1rem',
          flex: 1,
          overflow: 'auto'
        }}>
          {selectedResult ? (
            // Image Editor View
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '16px' }}>
                  {selectedResult.title}
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
                  {selectedResult.url.replace(/^https?:\/\//, '')}
                </p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontSize: '14px', 
                  fontWeight: '500' 
                }}>
                  Image URLs (one per line)
                </label>
                <textarea
                  value={imageUrls}
                  onChange={(e) => setImageUrls(e.target.value)}
                  placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '12px',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #dc3545',
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                    color: '#dc3545',
                    cursor: 'pointer'
                  }}
                  onClick={handleClearImages}
                >
                  Clear
                </button>
                <button
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                  onClick={handleSaveImages}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            // Results List View
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>
                  Select a search result to add or edit images:
                </p>
                {Object.keys(resultImages).length > 0 && (
                  <button
                    onClick={onClearAll}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      border: '1px solid #dc3545',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      color: '#dc3545',
                      cursor: 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              {results.slice(0, 10).map((result, idx) => (
                !result.ad && (
                  <div 
                    key={idx}
                    style={{
                      padding: '12px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      backgroundColor: 'var(--card-bg)',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => handleResultSelect(result)}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--border-subtle)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--card-bg)'}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ 
                          margin: '0 0 4px 0', 
                          color: 'var(--text)', 
                          fontSize: '14px',
                          fontWeight: '500',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {result.title}
                        </h4>
                        <p style={{ 
                          margin: '0', 
                          color: 'var(--muted)', 
                          fontSize: '12px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {result.url.replace(/^https?:\/\//, '')}
                        </p>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexShrink: 0
                      }}>
                        {resultImages[result.url]?.length > 0 && (
                          <span style={{
                            backgroundColor: '#007bff',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}>
                            {resultImages[result.url].length} image{resultImages[result.url].length !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span style={{ color: 'var(--muted)', fontSize: '12px' }}>→</span>
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
