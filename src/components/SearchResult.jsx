import React from 'react'

export default function SearchResult({ title, url, snippet, company, query, onClick }) {
  const handleClick = () => {
    onClick?.({ query, url })
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const displayUrl = url.replace(/^https?:\/\//, '')
  const domain = (() => { try { return new URL(url).hostname } catch { return displayUrl.split('/')[0] } })()
  const favicon = `https://icons.duckduckgo.com/ip3/${domain}.ico`
  const companyName = (company && String(company).trim()) || domain.replace(/^www\./, '').split('.')[0].replace(/[-_]/g, ' ')
  const snippet150 = snippet && snippet.length > 150 ? `${snippet.slice(0, 150)}…` : snippet
  return (
    <div className="result-card">
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
  )
}
