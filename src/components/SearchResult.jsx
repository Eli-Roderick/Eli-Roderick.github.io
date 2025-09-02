import React from 'react'

export default function SearchResult({ title, url, snippet, query, onClick }) {
  const handleClick = () => {
    onClick?.({ query, url })
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  return (
    <div className="result-card">
      <div className="result-url mb-1">{url.replace(/^https?:\/\//, '')}</div>
      <h3 className="result-title mb-1">
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <a href="#" onClick={handleClick}>{title}</a>
      </h3>
      <div className="result-snippet mb-6">{snippet}</div>
    </div>
  )
}
