import React from 'react'

export default function AdResult({ title, url, snippet, company, query, onClick }) {
  const handleClick = () => {
    onClick?.({ query, url })
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const displayUrl = url.replace(/^https?:\/\//, '')
  const domain = (() => { try { return new URL(url).hostname } catch { return displayUrl.split('/')[0] } })()
  
  // Use Google's favicon service for consistency with SearchResult component
  const getFaviconUrl = (domain) => {
    try {
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    } catch {
      return `https://www.google.com/s2/favicons?domain=example.com&sz=32`
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
              if (e.target.src !== `https://www.google.com/s2/favicons?domain=example.com&sz=32`) {
                e.target.src = `https://www.google.com/s2/favicons?domain=example.com&sz=32`
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
        <a href="#" onClick={handleClick}>{title}</a>
      </h3>
      <div className="result-snippet mb-6">{snippet150}</div>
    </div>
  )
}
