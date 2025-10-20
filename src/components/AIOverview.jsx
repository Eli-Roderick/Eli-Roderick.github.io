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
  
  // Create truncated version that preserves images but limits text
  const truncatedContent = useMemo(() => {
    if (!wasTruncated || expanded) return processedText
    
    // Split content by image URLs to handle text and images separately
    const imageUrlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?[^\s]*)?)/gi
    const parts = text.split(imageUrlRegex)
    
    let textCharCount = 0
    let result = ''
    const minTextChars = 50
    
    // First pass: include everything up to the limit, but ensure minimum text
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      
      // Reset regex for each test
      imageUrlRegex.lastIndex = 0
      
      // Check if this part is an image URL
      if (imageUrlRegex.test(part)) {
        // Always include images - they don't count toward text limit
        result += part
      } else {
        // This is text content
        const plainText = stripTags(part).trim()
        if (plainText.length > 0) {
          const remainingChars = limit - textCharCount
          
          if (remainingChars > 0) {
            if (plainText.length <= remainingChars) {
              result += part
              textCharCount += plainText.length
            } else {
              // Truncate this text part
              const truncated = part.substring(0, remainingChars)
              result += truncated
              textCharCount += stripTags(truncated).trim().length
              break
            }
          } else {
            // We've hit the text limit, stop adding text
            break
          }
        } else {
          // Include non-text content (like HTML tags, whitespace)
          result += part
        }
      }
    }
    
    // If we don't have enough text, force include more
    if (textCharCount < minTextChars) {
      // Find more text content to include
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        imageUrlRegex.lastIndex = 0
        
        if (!imageUrlRegex.test(part)) {
          const plainText = stripTags(part).trim()
          if (plainText.length > 0 && !result.includes(part)) {
            const needed = minTextChars - textCharCount
            if (plainText.length <= needed) {
              result += part
              textCharCount += plainText.length
            } else {
              const truncated = part.substring(0, needed)
              result += truncated
              textCharCount += stripTags(truncated).trim().length
            }
            
            if (textCharCount >= minTextChars) break
          }
        }
      }
    }
    
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
