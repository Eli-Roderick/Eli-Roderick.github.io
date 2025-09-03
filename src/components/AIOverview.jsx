import React, { useMemo, useState } from 'react'

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
        <span className="material-symbols-outlined text-[#1a73e8]" aria-hidden>diamond</span>
        <span>AI Overview</span>
      </div>
      <div className="ai-body whitespace-pre-wrap">{expanded ? text : display}</div>

      {/* Show more / less control */}
      {(!expanded && wasTruncated) ? (
        <button
          className="text-blue-600 hover:underline text-sm"
          onClick={() => setExpanded(true)}
        >
          Show more
        </button>
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
          {expanded && wasTruncated && (
            <button
              className="text-blue-600 hover:underline text-sm"
              onClick={() => setExpanded(false)}
            >
              Show less
            </button>
          )}
        </>
      )}
    </section>
  )
}
