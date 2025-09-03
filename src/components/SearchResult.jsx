import React from 'react'

export default function SearchResult({ title, url, snippet, query, onClick }) {
  const handleClick = () => {
    onClick?.({ query, url })
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const displayUrl = url.replace(/^https?:\/\//, '')
  const domain = (() => { try { return new URL(url).hostname } catch { return displayUrl.split('/')[0] } })()
  const favicon = `https://icons.duckduckgo.com/ip3/${domain}.ico`
  return (
    <div className="result-card">
      <div className="result-url mb-1 flex items-center gap-2">
        <img className="favicon" src={favicon} alt="" width={32} height={32} loading="lazy" />
        <span>{displayUrl}</span>
      </div>
      <h3 className="result-title mb-1">
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <a href="#" onClick={handleClick}>{title}</a>
      </h3>
      <div className="result-snippet mb-6">{snippet}</div>
    </div>
  )
}
