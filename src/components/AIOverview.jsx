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
  
  // Handle consecutive bracketed images specially
  // First, find all bracketed images and replace them with placeholders
  const bracketedImages = []
  let processed = html.replace(/\[https?:\/\/[^\]]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?[^\]]*)?\.?(?:webp|jpg|jpeg|png|gif|svg|bmp)?\]/gi, (match) => {
    // Extract the URL from brackets
    const url = match.slice(1, -1) // Remove [ and ]
    bracketedImages.push(url)
    return `__BRACKETED_IMAGE_${bracketedImages.length - 1}__`
  })
  
  // Check if we have consecutive bracketed image placeholders
  const lines = processed.split('\n')
  let result = []
  let consecutiveImagePlaceholders = []
  
  for (let line of lines) {
    const trimmed = line.trim()
    
    // Check if this line contains only bracketed image placeholders (one or more)
    if (/^(__BRACKETED_IMAGE_\d+__\s*)+$/.test(trimmed)) {
      // Extract all placeholder indices from this line
      const matches = trimmed.match(/__BRACKETED_IMAGE_(\d+)__/g) || []
      
      if (matches.length > 1) {
        // Multiple images on the same line - create horizontal row immediately
        let row = '<div class="image-row" style="display: flex; gap: 0.5rem; overflow-x: auto; margin: 0.75rem 0; padding: 0.25rem 0;">'
        matches.forEach(match => {
          const index = parseInt(match.match(/__BRACKETED_IMAGE_(\d+)__/)[1])
          const url = bracketedImages[index]
          row += `<img src="${url}" alt="User provided image" style="min-width: 200px; max-width: 200px; height: auto; border-radius: 0.5rem; flex-shrink: 0;" />`
        })
        row += '</div>'
        result.push(row)
      } else {
        // Single image on this line - add to consecutive collection
        matches.forEach(match => {
          const index = parseInt(match.match(/__BRACKETED_IMAGE_(\d+)__/)[1])
          consecutiveImagePlaceholders.push(bracketedImages[index])
        })
      }
    } else {
      // Process any accumulated consecutive images
      if (consecutiveImagePlaceholders.length > 0) {
        if (consecutiveImagePlaceholders.length === 1) {
          // Single image
          result.push(`<img src="${consecutiveImagePlaceholders[0]}" alt="User provided image" style="max-width: 200px; height: auto; margin: 0.5rem 0; border-radius: 0.5rem; display: block;" />`)
        } else {
          // Multiple consecutive images - horizontal row
          let row = '<div class="image-row" style="display: flex; gap: 0.5rem; overflow-x: auto; margin: 0.75rem 0; padding: 0.25rem 0;">'
          consecutiveImagePlaceholders.forEach(url => {
            row += `<img src="${url}" alt="User provided image" style="min-width: 200px; max-width: 200px; height: auto; border-radius: 0.5rem; flex-shrink: 0;" />`
          })
          row += '</div>'
          result.push(row)
        }
        consecutiveImagePlaceholders = []
      }
      
      // Replace any remaining placeholders in this line with individual images
      let processedLine = line
      bracketedImages.forEach((url, index) => {
        processedLine = processedLine.replace(`__BRACKETED_IMAGE_${index}__`, `<img src="${url}" alt="User provided image" style="max-width: 200px; height: auto; margin: 0.5rem 0; border-radius: 0.5rem; display: block;" />`)
      })
      
      result.push(processedLine)
    }
  }
  
  // Handle any remaining consecutive images at the end
  if (consecutiveImagePlaceholders.length > 0) {
    if (consecutiveImagePlaceholders.length === 1) {
      result.push(`<img src="${consecutiveImagePlaceholders[0]}" alt="User provided image" style="max-width: 200px; height: auto; margin: 0.5rem 0; border-radius: 0.5rem; display: block;" />`)
    } else {
      let row = '<div class="image-row" style="display: flex; gap: 0.5rem; overflow-x: auto; margin: 0.75rem 0; padding: 0.25rem 0;">'
      consecutiveImagePlaceholders.forEach(url => {
        row += `<img src="${url}" alt="User provided image" style="min-width: 200px; max-width: 200px; height: auto; border-radius: 0.5rem; flex-shrink: 0;" />`
      })
      row += '</div>'
      result.push(row)
    }
  }
  
  return result.join('\n')
}

export default function AIOverview({ text }) {
  if (!text) return null
  const [expanded, setExpanded] = useState(false)
  const limit = 750
  
  const processedText = useMemo(() => processContent(text), [text])
  
  // Check if text (excluding images) needs truncation
  const wasTruncated = useMemo(() => {
    const textWithoutImages = text.replace(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?[^\s]*)?)/gi, '')
    const plain = stripTags(textWithoutImages)
    return plain.trim().length > limit
  }, [text])
  
  // Create truncated version that ALWAYS shows at least 220 chars of text + all images in original positions
  const truncatedContent = useMemo(() => {
    if (!wasTruncated || expanded) return processedText
    
    // Strategy: Go through original text, include all images, ensure we get 220 chars of text
    const imageUrlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?[^\s]*)?)/gi
    
    // Count text characters in original content (excluding images)
    const textWithoutImages = text.replace(imageUrlRegex, '')
    const totalTextChars = stripTags(textWithoutImages).length
    
    if (totalTextChars <= limit) {
      // If total text is under limit, show everything
      return processedText
    }
    
    // Need to truncate: go through original text and collect 220 chars of text + all images
    let result = ''
    let textCharCount = 0
    let i = 0
    
    while (i < text.length && textCharCount < limit) {
      // Check if we're at the start of an image URL
      const remainingText = text.substring(i)
      const imageMatch = remainingText.match(/^(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?[^\s]*)?)/i)
      
      if (imageMatch) {
        // This is an image URL - include it completely
        result += imageMatch[0]
        i += imageMatch[0].length
      } else {
        // This is regular content - check if it adds to text count
        const char = text[i]
        result += char
        
        // Only count actual text characters (not HTML tags)
        if (char !== '<') {
          const plainChar = stripTags(char)
          if (plainChar.length > 0) {
            textCharCount++
          }
        } else {
          // Skip HTML tag
          const tagEnd = text.indexOf('>', i)
          if (tagEnd !== -1) {
            result += text.substring(i + 1, tagEnd + 1)
            i = tagEnd
          }
        }
        i++
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
