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
    
    // Strategy: Split content into parts, track text character count, include all images
    const imageUrlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?[^\s]*)?)/gi
    
    // Split content by images to get alternating text and image parts
    const parts = text.split(imageUrlRegex)
    let textCharCount = 0
    let result = ''
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      
      // Reset regex for testing
      imageUrlRegex.lastIndex = 0
      
      if (imageUrlRegex.test(part)) {
        // This is an image URL - always include it
        result += part
      } else {
        // This is text content - check if we should include it
        const plainTextInPart = stripTags(part)
        
        if (textCharCount + plainTextInPart.length <= limit) {
          // Include the whole part
          result += part
          textCharCount += plainTextInPart.length
        } else {
          // Truncate this text part
          const remainingChars = limit - textCharCount
          if (remainingChars > 0) {
            // Find where to cut in this part
            let partCharCount = 0
            let cutIndex = 0
            
            for (let j = 0; j < part.length; j++) {
              const char = part[j]
              if (char === '<') {
                // Skip HTML tags
                const tagEnd = part.indexOf('>', j)
                if (tagEnd !== -1) {
                  j = tagEnd
                  continue
                }
              }
              
              if (stripTags(char).length > 0) {
                partCharCount++
                if (partCharCount >= remainingChars) {
                  cutIndex = j + 1
                  break
                }
              }
            }
            
            result += part.substring(0, cutIndex)
          }
          break // Stop processing after truncation
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
