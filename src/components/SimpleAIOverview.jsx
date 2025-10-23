import React, { useState, useMemo } from 'react'
import { mdiStarFourPoints } from '@mdi/js'
import Icon from '@mdi/react'

function stripTags(html) {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export default function SimpleAIOverview({ htmlContent }) {
  if (!htmlContent) return null
  
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState(null) // 'up', 'down', or null
  const limit = 750

  // Check if text needs truncation
  const wasTruncated = useMemo(() => {
    const plain = stripTags(htmlContent)
    return plain.trim().length > limit
  }, [htmlContent, limit])

  // Create truncated version
  const truncatedContent = useMemo(() => {
    if (!wasTruncated || expanded) return htmlContent
    
    const plain = stripTags(htmlContent)
    if (plain.length <= limit) return htmlContent
    
    // Simple truncation - just cut at character limit
    const truncated = plain.substring(0, limit)
    return truncated.replace(/\n/g, '<br>')
  }, [htmlContent, wasTruncated, expanded, limit])

  // Handle feedback clicks
  const handleFeedback = (type) => {
    if (feedback === type) {
      setFeedback(null)
    } else {
      setFeedback(type)
    }
    console.log(`AI Overview feedback: ${type === null ? 'removed' : type}`)
  }

  return (
    <section className="ai-card">
      <div className="ai-header">
        <div className="flex items-center gap-2">
          <Icon path={mdiStarFourPoints} size={1.0} color="#1a73e8" aria-label="AI Overview" />
          <h2 className="text-sm font-medium">AI Overview</h2>
        </div>
      </div>
      
      <div
        className={`ai-body ${(!expanded && wasTruncated) ? 'ai-body--truncated' : ''}`}
        dangerouslySetInnerHTML={{ __html: expanded ? htmlContent : truncatedContent }}
      />

      {/* Show more control */}
      {(!expanded && wasTruncated) ? (
        <div className="ai-showmore">
          <button
            className="ai-showmore-btn"
            onClick={() => setExpanded(true)}
          >
            <span>Show more</span>
            <span className="material-symbols-outlined text-blue-500 text-lg ml-2" aria-hidden="true">keyboard_arrow_down</span>
          </button>
        </div>
      ) : null}

      {/* Footer: show immediately if not truncated; otherwise only when expanded */}
      {(expanded || !wasTruncated) && (
        <div className="ai-footer">
          <div className="text-[11px]">AI responses may include mistakes</div>
          <div className="ai-actions">
            <button 
              className={`ai-feedback-btn ${feedback === 'up' ? 'ai-feedback-active' : ''}`}
              onClick={() => handleFeedback('up')}
              title="Thumbs up" 
              aria-label="Thumbs up"
            >
              <span className="material-symbols-outlined text-[18px]">thumb_up</span>
            </button>
            <button 
              className={`ai-feedback-btn ${feedback === 'down' ? 'ai-feedback-active' : ''}`}
              onClick={() => handleFeedback('down')}
              title="Thumbs down" 
              aria-label="Thumbs down"
            >
              <span className="material-symbols-outlined text-[18px]">thumb_down</span>
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
