import React, { useState } from 'react'

export default function SearchResult({ 
  title, 
  url, 
  snippet, 
  company, 
  images, 
  query, 
  onClick, 
  onImagesUpdate, 
  selectedForImageEdit, 
  onCloseImageEditor 
}) {
  const [imageUrls, setImageUrls] = useState(images ? images.join('\n') : '')
  
  // Update imageUrls when images prop changes
  React.useEffect(() => {
    setImageUrls(images ? images.join('\n') : '')
  }, [images])
  
  const handleClick = (e) => {
    e.preventDefault()
    onClick?.({ query, url, title, type: 'result' })
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  
  const handleAuxClick = (e) => {
    // Middle mouse button click
    if (e.button === 1) {
      e.preventDefault()
      handleClick(e)
    }
  }
  const displayUrl = url.replace(/^https?:\/\//, '')
  const domain = (() => { try { return new URL(url).hostname } catch { return displayUrl.split('/')[0] } })()
  
  // Use DuckDuckGo's favicon service for transparent icons
  const getFaviconUrl = (domain) => {
    try {
      return `https://icons.duckduckgo.com/ip3/${domain}.ico`
    } catch {
      return `https://icons.duckduckgo.com/ip3/example.com.ico`
    }
  }
  
  const favicon = getFaviconUrl(domain)
  const companyName = (company && String(company).trim()) || (() => {
    const name = domain.replace(/^www\./, '').split('.')[0].replace(/[-_]/g, ' ')
    return name.charAt(0).toUpperCase() + name.slice(1)
  })()
  
  // Parse star rating from snippet FIRST (before truncation) - format: [[rating:4.8:Author Name]] or [[rating:4.8]]
  const parseStarRating = (text) => {
    if (!text) return { text, rating: null, author: null }
    
    const ratingMatch = text.match(/\[\[rating:([\d.]+)(?::([^\]]+))?\]\]/)
    if (!ratingMatch) return { text, rating: null, author: null }
    
    const rating = parseFloat(ratingMatch[1])
    const author = ratingMatch[2] || null
    const cleanText = text.replace(/\[\[rating:[^\]]+\]\]/, '').trim()
    
    return { text: cleanText, rating, author }
  }
  
  // Extract rating from full snippet first
  const { text: cleanSnippet, rating: starRating, author: ratingAuthor } = parseStarRating(snippet)
  
  // Then truncate only the text portion (rating is rendered separately)
  const snippetText = cleanSnippet && cleanSnippet.length > 150 ? `${cleanSnippet.slice(0, 150)}…` : cleanSnippet
  
  // Render star rating component
  const renderStarRating = (rating, author) => {
    if (rating === null) return null
    
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)
    
    return (
      <div className="star-rating-line">
        <span className="star-rating-value">{rating}</span>
        <span className="star-rating-stars">
          {'★'.repeat(fullStars)}
          {hasHalfStar && '★'}
          {'☆'.repeat(emptyStars)}
        </span>
        {author && (
          <>
            <span className="star-rating-separator">·</span>
            <span className="star-rating-author">Review by {author}</span>
          </>
        )}
      </div>
    )
  }
  
  // Process images (limit to 3)
  const resultImages = images ? images.slice(0, 3) : []
  
  const handleSaveImages = () => {
    const urls = imageUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url && /^https?:\/\//.test(url))
      .slice(0, 3) // Limit to 3 images
    
    onImagesUpdate?.(url, urls)
    onCloseImageEditor?.()
  }
  
  // Determine layout based on number of images
  const getImageLayout = (count) => {
    switch (count) {
      case 1: return 'single'
      case 2: return 'row' // 2 images horizontally in a row
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
            <img 
              className="favicon" 
              src={favicon} 
              alt="" 
              width={32} 
              height={32} 
              loading="lazy"
              onError={(e) => {
                // Fallback to a generic icon if favicon fails to load
                if (e.target.src !== `https://www.google.com/s2/favicons?domain=example.com&sz=32`) {
                  e.target.src = `https://www.google.com/s2/favicons?domain=example.com&sz=32`
                } else {
                  // If even the fallback fails, hide the image
                  e.target.style.display = 'none'
                }
              }}
            />
            <div className="min-w-0">
              {companyName && <div className="company-name">{companyName}</div>}
              <div className="truncate">{displayUrl}</div>
            </div>
          </div>
          <h3 className="result-title mb-1">
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a href="#" onClick={handleClick} onAuxClick={handleAuxClick}>{title}</a>
          </h3>
          
          {/* Images - Mobile: between title and snippet, Desktop: on the right */}
          {resultImages.length > 0 && (
            <div className={`result-images-mobile result-images-${layout}`}>
              {layout === 'single' && (
                <img 
                  src={resultImages[0]} 
                  alt="Result image" 
                  className="result-image-single"
                  loading="lazy"
                />
              )}
              
              {layout === 'row' && (
                <div className="result-images-row">
                  <img 
                    src={resultImages[0]} 
                    alt="Result image 1" 
                    className="result-image-row-left"
                    loading="lazy"
                  />
                  <img 
                    src={resultImages[1]} 
                    alt="Result image 2" 
                    className="result-image-row-right"
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
          
          <div className="result-snippet mb-6">
            {snippetText}
            {renderStarRating(starRating, ratingAuthor)}
          </div>
        </div>
        
        {/* Right side - Images (Desktop only) */}
        {resultImages.length > 0 && (
          <div className={`result-images-desktop result-images-${layout}`}>
            {layout === 'single' && (
              <img 
                src={resultImages[0]} 
                alt="Result image" 
                className="result-image-single"
                loading="lazy"
              />
            )}
            
            {layout === 'row' && (
              <div className="result-images-row">
                <img 
                  src={resultImages[0]} 
                  alt="Result image 1" 
                  className="result-image-row-left"
                  loading="lazy"
                />
                <img 
                  src={resultImages[1]} 
                  alt="Result image 2" 
                  className="result-image-row-right"
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
      {selectedForImageEdit && (
        <div style={{
          position: 'fixed',
          top: '0px',
          left: '0px',
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999999,
          pointerEvents: 'all'
        }} onClick={() => onCloseImageEditor?.()}>
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
                onClick={() => onCloseImageEditor?.()}
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
                onClick={() => onCloseImageEditor?.()}
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
