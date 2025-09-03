import React from 'react'

export default function AIOverview({ text }) {
  if (!text) return null
  return (
    <section className="ai-card">
      <div className="ai-header">AI Overview</div>
      <div className="ai-body whitespace-pre-wrap">{text}</div>
      <div className="ai-footer">
        <div className="text-[11px]">AI responses may include mistakes</div>
        <div className="ai-actions">
          {/* Non-functional buttons for now */}
          <button className="icon-btn" aria-label="Thumbs up" title="Thumbs up">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M2 10h4v12H2V10zm19.293.293A1 1 0 0 0 20.586 10H14V6a3 3 0 0 0-3-3l-1 4-3 4v9a2 2 0 0 0 2 2h7.764a3 3 0 0 0 2.928-2.268l1.6-6.398a2 2 0 0 0-.999-2.041z"/>
            </svg>
          </button>
          <button className="icon-btn" aria-label="Thumbs down" title="Thumbs down">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M22 14h-4V2h4v12zM4.707 13.707A1 1 0 0 0 5.414 14H12v4a3 3 0 0 0 3 3l1-4 3-4V6a2 2 0 0 0-2-2H9.236a3 3 0 0 0-2.928 2.268l-1.6 6.398a2 2 0 0 0 .999 2.041z"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}
