import React from 'react'

export default function AdResult({ title, url, snippet, query, onClick }) {
  const handleClick = () => {
    onClick?.({ query, url })
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const displayUrl = url.replace(/^https?:\/\//, '')
  const favicon = `https://www.google.com/s2/favicons?sz=16&domain_url=${encodeURIComponent(url)}`
  return (
    <div className="result-card">
      <div className="flex items-center gap-2 mb-1">
        <span className="ad-badge">Ad</span>
        <span className="result-url flex items-center gap-2">
          <img src={favicon} alt="" width={16} height={16} loading="lazy" />
          <span>{displayUrl}</span>
        </span>
      </div>
      <h3 className="result-title mb-1">
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <a href="#" onClick={handleClick}>{title}</a>
      </h3>
      <div className="result-snippet mb-6">{snippet}</div>
    </div>
  )
}
