import React, { useState } from 'react'

export default function SearchResult({ title, url, snippet, company, images, query, onClick, onImagesUpdate }) {
  const [showImageModal, setShowImageModal] = useState(false)
  const [imageUrls, setImageUrls] = useState(images ? images.join('\n') : '')
  
  const handleClick = () => {
    onClick?.({ query, url })
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const displayUrl = url.replace(/^https?:\/\//, '')
  const domain = (() => { try { return new URL(url).hostname } catch { return displayUrl.split('/')[0] } })()
  const favicon = `https://icons.duckduckgo.com/ip3/${domain}.ico`
  const companyName = (company && String(company).trim()) || domain.replace(/^www\./, '').split('.')[0].replace(/[-_]/g, ' ')
  const snippet150 = snippet && snippet.length > 150 ? `${snippet.slice(0, 150)}…` : snippet
  
  // Process images (limit to 3)
  const resultImages = images ? images.slice(0, 3) : []
  
  const handleSaveImages = () => {
    const urls = imageUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url && /^https?:\/\//.test(url))
      .slice(0, 3) // Limit to 3 images
    
    onImagesUpdate?.(url, urls)
    setShowImageModal(false)
  }
  
  const handleOpenImageModal = () => {
    setImageUrls(images ? images.join('\n') : '')
    setShowImageModal(true)
  }
  
  // Determine layout based on number of images
  const getImageLayout = (count) => {
    switch (count) {
      case 1: return 'single'
      case 2: return 'stacked' // 2 images vertically stacked
      case 3: return 'grid' // 2x2 grid with one spanning
      default: return 'none'
    }
  }
  
  const layout = getImageLayout(resultImages.length)
  
  return (
    <div className="result-card">
      <div className="result-content-wrapper">
        {/* Left side - Text content */}
        <div className="result-text-content">
          <div className="result-url mb-1 flex items-start gap-2">
            <img className="favicon" src={favicon} alt="" width={32} height={32} loading="lazy" />
            <div className="min-w-0">
              {companyName && <div className="company-name">{companyName}</div>}
              <div className="truncate">{displayUrl}</div>
            </div>
          </div>
          <h3 className="result-title mb-1">
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a href="#" onClick={handleClick}>{title}</a>
          </h3>
          <div className="result-snippet mb-6">{snippet150}</div>
          
          {/* Add Images Button */}
          <button 
            onClick={handleOpenImageModal}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '14px' }}>🖼️</span>
            {resultImages.length > 0 ? `Edit Images (${resultImages.length})` : 'Add Images'}
          </button>
        </div>
        
        {/* Right side - Images */}
        {resultImages.length > 0 && (
          <div className={`result-images result-images-${layout}`}>
            {layout === 'single' && (
              <img 
                src={resultImages[0]} 
                alt="Result image" 
                className="result-image-single"
                loading="lazy"
              />
            )}
            
            {layout === 'stacked' && (
              <div className="result-images-stacked">
                <img 
                  src={resultImages[0]} 
                  alt="Result image 1" 
                  className="result-image-stacked-top"
                  loading="lazy"
                />
                <img 
                  src={resultImages[1]} 
                  alt="Result image 2" 
                  className="result-image-stacked-bottom"
                  loading="lazy"
                />
              </div>
            )}
            
            {layout === 'grid' && (
              <div className="result-images-grid">
                <img 
                  src={resultImages[0]} 
                  alt="Result image 1" 
                  className="result-image-grid-main"
                  loading="lazy"
                />
                <div className="result-images-grid-side">
                  <img 
                    src={resultImages[1]} 
                    alt="Result image 2" 
                    className="result-image-grid-small"
                    loading="lazy"
                  />
                  <img 
                    src={resultImages[2]} 
                    alt="Result image 3" 
                    className="result-image-grid-small"
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Image Modal */}
      {showImageModal && (
        <div style={{
          position: 'fixed',
          top: '0px',
          left: '0px',
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999999,
          pointerEvents: 'all'
        }} onClick={() => setShowImageModal(false)}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '400px',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            zIndex: 1000000,
            pointerEvents: 'all',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ 
              padding: '1rem', 
              borderBottom: '1px solid var(--border)', 
              backgroundColor: 'var(--card-bg)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '16px', fontWeight: '600' }}>Add Images</h3>
              <button 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '18px', 
                  cursor: 'pointer',
                  color: 'var(--muted)'
                }} 
                onClick={() => setShowImageModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1rem', backgroundColor: 'var(--card-bg)' }}>
              <div style={{ marginBottom: '1rem', color: 'var(--muted)', fontSize: '14px' }}>
                <p style={{ margin: '0 0 8px 0' }}><strong>Instructions:</strong></p>
                <p style={{ margin: '0 0 4px 0' }}>• Enter up to 3 image URLs (one per line)</p>
                <p style={{ margin: '0 0 4px 0' }}>• URLs must start with http:// or https://</p>
                <p style={{ margin: '0' }}>• Images will appear to the right of this result</p>
              </div>
              <textarea
                value={imageUrls}
                onChange={(e) => setImageUrls(e.target.value)}
                placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg&#10;https://example.com/image3.jpg"
                style={{
                  width: '100%',
                  height: '120px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '8px',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>

            {/* Footer */}
            <div style={{ 
              padding: '1rem', 
              borderTop: '1px solid var(--border)', 
              backgroundColor: 'var(--card-bg)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              <button 
                style={{ 
                  padding: '6px 12px', 
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '14px'
                }} 
                onClick={() => setShowImageModal(false)}
              >
                Cancel
              </button>
              <button 
                style={{ 
                  padding: '6px 12px', 
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }} 
                onClick={handleSaveImages}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
