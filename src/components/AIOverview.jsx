import React, { useState, useMemo, useEffect } from 'react'
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
  
  console.log('Input HTML:', html)
  console.log('Contains { ?', html.includes('{'))
  console.log('Contains } ?', html.includes('}'))
  
  // Step 0: Clean up HTML tags that might split curly braces
  // Remove span and div tags but keep their content to merge split braces
  let processed = html
    .replace(/<span[^>]*>/g, '')
    .replace(/<\/span>/g, '')
    .replace(/<div[^>]*>/g, '')
    .replace(/<\/div>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .trim()
  console.log('After cleaning HTML:', processed)
  
  // Step 0.5: Fix malformed curly brace patterns
  // Look for patterns like "{[url][url] }" and fix them to "{[url][url]}"
  processed = processed.replace(/\{\s*(\[[^\]]+\])\s*(\[[^\]]+\])\s*\}/g, '{$1$2}')
  console.log('After fixing patterns:', processed)
  
  // Use placeholders to prevent double processing
  const placeholders = new Map()
  let placeholderCounter = 0
  
  // Step 1: Handle curly brace grouped images - check for HTML encoded braces too
  
  // Function to create image row
  const createImageRow = (imageMatches) => {
    const containerId = `image-row-${Math.random().toString(36).substr(2, 9)}`
    let row = `<div class="image-row-container" style="clear: both; margin: 1rem 0;">
      <div class="image-row" id="${containerId}" style="display: flex !important; flex-direction: row !important; gap: 0.5rem !important; overflow-x: auto !important; scroll-behavior: smooth !important;">`
    
    let hasValidImages = false
    imageMatches.forEach(bracketedUrl => {
      const url = bracketedUrl.slice(1, -1) // Remove [ and ]
      console.log('Processing URL:', url)
      // Check if it's an image URL
      if (/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?.*)?$/i.test(url)) {
        console.log('Valid image URL:', url)
        row += `<img src="${url}" alt="User provided image" style="min-width: 200px !important; max-width: 200px !important; width: 200px !important; height: auto !important; border-radius: 0.5rem !important; flex-shrink: 0 !important;" />`
        hasValidImages = true
      }
    })
    
    row += `</div>
      <div class="scroll-indicator scroll-indicator-left" onclick="scrollImageRow('${containerId}', -200)" style="display: none;"></div>
      <div class="scroll-indicator scroll-indicator-right" onclick="scrollImageRow('${containerId}', 200)" style="display: none;"></div>
    </div>`
    
    if (hasValidImages) {
      console.log('Creating image row with', imageMatches.length, 'images')
      const placeholder = `__IMAGE_ROW_PLACEHOLDER_${placeholderCounter++}__`
      placeholders.set(placeholder, row)
      return placeholder
    }
    return null
  }

  // Try normal curly braces first
  processed = processed.replace(/\{(\[[^\]]+\])+\}/g, (match) => {
    console.log('Processing normal curly brace match:', match)
    const imageMatches = match.match(/\[([^\]]+)\]/g) || []
    console.log('Found image matches:', imageMatches)
    const result = createImageRow(imageMatches)
    return result || match
  })
  
  // Try HTML encoded curly braces
  processed = processed.replace(/&#123;(\[[^\]]+\])+&#125;/g, (match) => {
    console.log('Processing HTML encoded curly brace match:', match)
    const imageMatches = match.match(/\[([^\]]+)\]/g) || []
    console.log('Found image matches in encoded:', imageMatches)
    const result = createImageRow(imageMatches)
    return result || match
  })
  
  // Try &lbrace; and &rbrace;
  processed = processed.replace(/&lbrace;(\[[^\]]+\])+&rbrace;/g, (match) => {
    console.log('Processing &lbrace; encoded match:', match)
    const imageMatches = match.match(/\[([^\]]+)\]/g) || []
    console.log('Found image matches in &lbrace;:', imageMatches)
    const result = createImageRow(imageMatches)
    return result || match
  })
  
  // Step 2: Handle individual bracketed images [image]
  processed = processed.replace(/\[([^\]]+)\]/g, (match, url) => {
    // Check if it's an image URL
    if (/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?.*)?$/i.test(url)) {
      return `<div style="clear: both; margin: 1rem 0;"><img src="${url}" alt="User provided image" style="max-width: 200px; height: auto; border-radius: 0.5rem; display: block;" /></div>`
    }
    return match // Return original if not an image
  })
  
  // Step 3: Replace placeholders with actual content
  placeholders.forEach((content, placeholder) => {
    processed = processed.replace(placeholder, content)
  })
  
  return processed
}

// Global function for scroll indicators
window.scrollImageRow = function(containerId, scrollAmount) {
  const container = document.getElementById(containerId)
  if (container) {
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    // Update scroll indicators after scrolling
    setTimeout(() => updateScrollIndicators(containerId), 300)
  }
}

function updateScrollIndicators(containerId) {
  const container = document.getElementById(containerId)
  if (!container) return
  
  const leftIndicator = container.parentElement.querySelector('.scroll-indicator-left')
  const rightIndicator = container.parentElement.querySelector('.scroll-indicator-right')
  
  if (leftIndicator && rightIndicator) {
    // Check if scrolling is needed at all
    const needsScrolling = container.scrollWidth > container.clientWidth
    
    if (!needsScrolling) {
      // If no scrolling needed, hide both indicators
      leftIndicator.style.display = 'none'
      rightIndicator.style.display = 'none'
      return
    }
    
    // If scrolling is needed, show/hide based on scroll position
    const canScrollLeft = container.scrollLeft > 0
    const canScrollRight = container.scrollLeft < (container.scrollWidth - container.clientWidth)
    
    leftIndicator.style.display = canScrollLeft ? 'flex' : 'none'
    rightIndicator.style.display = canScrollRight ? 'flex' : 'none'
  }
}

export default function AIOverview({ text }) {
  if (!text) return null
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState(null) // 'up', 'down', or null
  const limit = 750
  
  const processedText = useMemo(() => processContent(text), [text])
  
  // Handle feedback clicks
  const handleFeedback = (type) => {
    if (feedback === type) {
      // If clicking the same button, toggle it off
      setFeedback(null)
    } else {
      // Set new feedback
      setFeedback(type)
    }
    
    // Optional: You could add analytics or API calls here
    console.log(`AI Overview feedback: ${type === null ? 'removed' : type}`)
  }
  
  // Update scroll indicators when component mounts or text changes
  useEffect(() => {
    const containers = document.querySelectorAll('.image-row')
    containers.forEach(container => {
      if (container.id) {
        // Initial check
        updateScrollIndicators(container.id)
        
        // Check again after images load (with delay)
        setTimeout(() => updateScrollIndicators(container.id), 100)
        setTimeout(() => updateScrollIndicators(container.id), 500)
        
        // Add scroll event listener to update indicators
        const scrollHandler = () => updateScrollIndicators(container.id)
        container.addEventListener('scroll', scrollHandler)
        
        // Store handler for cleanup
        container._scrollHandler = scrollHandler
      }
    })
    
    return () => {
      containers.forEach(container => {
        if (container.id && container._scrollHandler) {
          container.removeEventListener('scroll', container._scrollHandler)
          delete container._scrollHandler
        }
      })
    }
  }, [processedText])
  
  // Check if text (excluding images) needs truncation
  const wasTruncated = useMemo(() => {
    const textWithoutImages = text.replace(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?[^\s]*)?)/gi, '')
    const plain = stripTags(textWithoutImages)
    return plain.trim().length > limit
  }, [text])
  
  // Create truncated version that ALWAYS shows at least 750 chars of text + all images in original positions
  const truncatedContent = useMemo(() => {
    if (!wasTruncated || expanded) return processedText
    
    // Strategy: Split text into segments, preserve image blocks, truncate text portions
    const imageBlockRegex = /(\{(?:\[[^\]]+\])+\}|\[[^\]]+\])/g
    const segments = text.split(imageBlockRegex)
    
    let result = ''
    let textCharCount = 0
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      
      // Check if this segment is an image block
      if (imageBlockRegex.test(segment)) {
        // This is an image block - always include it
        result += segment
        imageBlockRegex.lastIndex = 0 // Reset regex
      } else {
        // This is text content - check if we need to truncate
        const segmentTextLength = stripTags(segment).length
        
        if (textCharCount + segmentTextLength <= limit) {
          // Include entire segment
          result += segment
          textCharCount += segmentTextLength
        } else {
          // Truncate this segment
          const remainingChars = limit - textCharCount
          if (remainingChars > 0) {
            // Take only part of this segment
            let truncatedSegment = ''
            let segmentCharCount = 0
            
            for (let j = 0; j < segment.length && segmentCharCount < remainingChars; j++) {
              const char = segment[j]
              truncatedSegment += char
              
              // Count only visible text characters
              const plainChar = stripTags(char)
              if (plainChar.length > 0) {
                segmentCharCount++
              }
            }
            
            result += truncatedSegment
          }
          break // Stop processing further segments
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
        </>
      )}
    </section>
  )
}
