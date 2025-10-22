import React, { useState, useRef } from 'react'

export default function AIOverviewEditor({ 
  isOpen, 
  onClose, 
  onSave, 
  initialText = '', 
  initialTitle = '' 
}) {
  const [text, setText] = useState(initialText)
  const [title, setTitle] = useState(initialTitle)
  const textareaRef = useRef(null)

  const handleSave = () => {
    onSave({ title: title.trim() || 'AI Overview', text })
    onClose()
  }

  const handlePaste = (e) => {
    // Let the default paste behavior work
    // The textarea will handle the paste naturally
  }

  const renderPreview = () => {
    if (!text) return null

    // Parse image syntax: [url] for single images, {[url1][url2]} for horizontal rows
    const parts = text.split(/(\{[^}]+\}|\[[^\]]+\])/g)
    
    return (
      <div style={{ 
        marginTop: '1rem', 
        padding: '1rem', 
        border: '1px solid var(--border)', 
        borderRadius: '4px',
        backgroundColor: 'var(--bg)'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '16px', fontWeight: '600' }}>Preview:</h3>
        <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
          {parts.map((part, index) => {
            // Handle horizontal image rows {[url1][url2][url3]}
            if (part.startsWith('{') && part.endsWith('}')) {
              const urls = part.slice(1, -1).match(/\[([^\]]+)\]/g)?.map(match => match.slice(1, -1)) || []
              if (urls.length > 0) {
                return (
                  <div key={index} style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    margin: '8px 0',
                    overflowX: 'auto'
                  }}>
                    {urls.map((url, imgIndex) => (
                      <img 
                        key={imgIndex}
                        src={url} 
                        alt={`Image ${imgIndex + 1}`}
                        style={{ 
                          height: '120px', 
                          objectFit: 'cover',
                          borderRadius: '4px',
                          flexShrink: 0
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    ))}
                  </div>
                )
              }
            }
            
            // Handle single images [url]
            if (part.startsWith('[') && part.endsWith(']')) {
              const url = part.slice(1, -1)
              return (
                <div key={index} style={{ margin: '8px 0' }}>
                  <img 
                    src={url} 
                    alt="AI Overview Image"
                    style={{ 
                      maxWidth: '120px', 
                      height: '120px', 
                      objectFit: 'cover',
                      borderRadius: '4px'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                </div>
              )
            }
            
            // Handle regular text
            return <span key={index}>{part}</span>
          })}
        </div>
      </div>
    )
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
        maxWidth: '800px',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        maxHeight: '90vh',
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
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>AI Overview Editor</h2>
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

        {/* Body */}
        <div style={{
          padding: '1rem',
          flex: 1,
          overflow: 'auto'
        }}>
          {/* Title Input */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontSize: '14px', 
              fontWeight: '500' 
            }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="AI Overview Title"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* Instructions */}
          <div style={{ marginBottom: '1rem', fontSize: '14px', color: 'var(--muted)' }}>
            <p style={{ margin: '0 0 4px 0' }}><strong>Image Syntax:</strong></p>
            <p style={{ margin: '0 0 4px 0' }}>• Single image: [https://example.com/image.jpg]</p>
            <p style={{ margin: '0' }}>• Horizontal row: {'{[image1.jpg][image2.jpg][image3.jpg]}'}</p>
          </div>

          {/* Text Editor */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontSize: '14px', 
              fontWeight: '500' 
            }}>
              Content
            </label>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={handlePaste}
              placeholder="Paste your AI overview content here..."
              style={{
                width: '100%',
                minHeight: '200px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '12px',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Preview */}
          {renderPreview()}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          <button
            style={{
              padding: '8px 16px',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text)',
              cursor: 'pointer'
            }}
            onClick={onClose}
          >
            Cancel
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
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
