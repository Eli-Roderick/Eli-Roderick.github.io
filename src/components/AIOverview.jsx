import React, { useMemo, useState } from 'react'
import Icon from '@mdi/react'
import { mdiStarFourPoints } from '@mdi/js'

function stripTags(html) {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

function processContent(html) {
  if (!html) return html
  
  // Convert image URLs to img tags
  // Look for URLs that end with image extensions
  const imageUrlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?[^\s]*)?)/gi
  
  return html.replace(imageUrlRegex, (url) => {
    return `<img src="${url}" alt="User provided image" style="max-width: 100%; height: auto; margin: 0.5rem 0; border-radius: 0.5rem; display: block;" />`
  })
}

export default function AIOverview({ text }) {
  if (!text) return null
  const [expanded, setExpanded] = useState(false)
  const limit = 220
  
  const processedText = useMemo(() => processContent(text), [text])
  
  // Check if text (excluding images) needs truncation
  const wasTruncated = useMemo(() => {
    // Remove image URLs from text before checking length
    const textWithoutImages = text.replace(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?[^\s]*)?)/gi, '')
    const plain = stripTags(textWithoutImages)
    return plain.trim().length > limit
  }, [text])
  
  // Create truncated version - always show images, truncate only text
  const truncatedContent = useMemo(() => {
    if (!wasTruncated || expanded) return processedText
    
    // Simple approach: replace image URLs with placeholders, truncate text, then restore images
    const imageUrlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?[^\s]*)?)/gi
    const images = []
    let textOnly = text.replace(imageUrlRegex, (match) => {
      images.push(match)
      return `__IMAGE_${images.length - 1}__`
    })
    
    // Truncate the text-only version
    const plainText = stripTags(textOnly)
    if (plainText.length > limit) {
      // Find where to cut off in the original text
      let charCount = 0
      let cutIndex = 0
      
      for (let i = 0; i < textOnly.length; i++) {
        const char = textOnly[i]
        if (char === '<') {
          // Skip HTML tags
          const tagEnd = textOnly.indexOf('>', i)
          if (tagEnd !== -1) {
            i = tagEnd
            continue
          }
        }
        
        if (stripTags(char).length > 0) {
          charCount++
          if (charCount >= limit) {
            cutIndex = i + 1
            break
          }
        }
      }
      
      textOnly = textOnly.substring(0, cutIndex)
    }
    
    // Restore images
    let result = textOnly
    images.forEach((imageUrl, index) => {
      result = result.replace(`__IMAGE_${index}__`, imageUrl)
    })
    
    return processContent(result)
  }, [text, processedText, wasTruncated, expanded, limit])
  return (
    <section className="ai-card">
      <div className="ai-header">
        <div className="flex items-center gap-2">
          <Icon path={mdiStarFourPoints} size={1.0} color="#1a73e8" aria-label="AI Overview" />
          <h2 className="text-sm font-medium">AI Overview</h2>
        </div>
      </div>
      <div
        className={`ai-body whitespace-pre-wrap ${(!expanded && wasTruncated) ? 'ai-body--truncated' : ''}`}
        dangerouslySetInnerHTML={{ __html: expanded ? processedText : truncatedContent }}
      />

      {/* Show more control (full-width button at bottom) */}
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
