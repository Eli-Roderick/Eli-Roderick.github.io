import React, { useMemo, useState } from 'react'
import Icon from '@mdi/react'
import { mdiStarFourPoints } from '@mdi/js'

export default function AIOverview({ text }) {
  if (!text) return null
  const [expanded, setExpanded] = useState(false)
  const limit = 220
  const { display, wasTruncated } = useMemo(() => {
    if (!text) return { display: '', wasTruncated: false }
    if (text.length <= limit) return { display: text, wasTruncated: false }
    return { display: text.slice(0, limit).trimEnd() + '…', wasTruncated: true }
  }, [text])
  return (
    <section className="ai-card">
      <div className="ai-header">
        <div className="flex items-center gap-2">
          <Icon path={mdiStarFourPoints} size={1.0} color="#1a73e8" aria-label="AI Overview" />
          <h2 className="text-sm font-medium">AI Overview</h2>
        </div>
      </div>
      <div className={`ai-body whitespace-pre-wrap ${(!expanded && wasTruncated) ? 'ai-body--truncated' : ''}`}>
        {expanded ? text : display}
      </div>

      {/* Show more control (full-width button at bottom) */}
      {(!expanded && wasTruncated) ? (
        <div className="ai-showmore">
          <button
            className="ai-showmore-btn"
            onClick={() => setExpanded(true)}
          >
            Show more
          </button>
        </div>
      ) : null}

      {/* Footer: show immediately if not truncated; otherwise only when expanded */}
      {(expanded || !wasTruncated) && (
        <>
          <div className="ai-footer">
            <div className="text-[11px]">AI responses may include mistakes</div>
            <div className="ai-actions">
              <span className="material-symbols-outlined text-blue-400 text-[18px] cursor-pointer" title="Thumbs up" aria-label="Thumbs up">thumb_up</span>
              <span className="material-symbols-outlined text-blue-400 text-[18px] cursor-pointer" title="Thumbs down" aria-label="Thumbs down">thumb_down</span>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
