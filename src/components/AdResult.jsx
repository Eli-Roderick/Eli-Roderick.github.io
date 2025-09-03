import React from 'react'

export default function AdResult({ title, url, snippet, query, onClick }) {
  const handleClick = () => {
    onClick?.({ query, url })
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  return (
    <div className="result-card">
      <div className="flex items-center gap-2 mb-1">
        <span className="ad-badge">Ad</span>
        <span className="result-url">{url.replace(/^https?:\/\//, '')}</span>
      </div>
      <h3 className="result-title mb-1">
        <span className="link-with-sep">
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <a href="#" onClick={handleClick}>{title}</a>
          <div className="link-sep" />
        </span>
      </h3>
      <div className="result-snippet mb-6">{snippet}</div>
    </div>
  )
}
