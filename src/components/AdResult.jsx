import React from 'react'

export default function AdResult({ title, url, snippet, company, query, onClick }) {
  const handleClick = (e) => {
    e.preventDefault()
    onClick?.({ query, url, title, type: 'ad' })
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
  const companyName = (company && String(company).trim()) || domain.replace(/^www\./, '').split('.')[0].replace(/[-_]/g, ' ')
  const snippet150 = snippet && snippet.length > 150 ? `${snippet.slice(0, 150)}…` : snippet
  return (
    <div className="result-card">
      <div className="flex items-start gap-2 mb-1">
        <span className="ad-badge">Ad</span>
        <span className="result-url flex items-start gap-2">
          <img 
            className="favicon" 
            src={favicon} 
            alt="" 
            width={32} 
            height={32} 
            loading="lazy"
            onError={(e) => {
              // Fallback to a generic icon if favicon fails to load
              if (e.target.src !== `https://icons.duckduckgo.com/ip3/example.com.ico`) {
                e.target.src = `https://icons.duckduckgo.com/ip3/example.com.ico`
              } else {
                // If even the fallback fails, hide the image
                e.target.style.display = 'none'
              }
            }}
          />
          <span className="min-w-0">
            {companyName && <div className="company-name">{companyName}</div>}
            <div className="truncate">{displayUrl}</div>
          </span>
        </span>
      </div>
      <h3 className="result-title mb-1">
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <a href="#" onClick={handleClick} onAuxClick={handleAuxClick}>{title}</a>
      </h3>
      <div className="result-snippet mb-6">{snippet150}</div>
    </div>
  )
}
