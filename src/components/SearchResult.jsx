import React from 'react'

export default function SearchResult({ title, url, snippet, company, images, query, onClick }) {
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
    </div>
  )
}
