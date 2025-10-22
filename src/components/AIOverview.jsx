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
  if (!html) return ''
  let processed = html
  
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
      // Check if it's an image URL
      if (/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?.*)?$/i.test(url)) {
        row += `<img src="${url}" alt="User provided image" style="min-width: 200px !important; max-width: 200px !important; width: 200px !important; height: auto !important; border-radius: 0.5rem !important; flex-shrink: 0 !important; object-fit: cover !important;" />`
        hasValidImages = true
      }
    })
    
    row += `</div>
      <div class="scroll-indicator-left" style="display: none;" onclick="scrollImageRow('${containerId}', -200)"></div>
      <div class="scroll-indicator-right" style="display: none;" onclick="scrollImageRow('${containerId}', 200)"></div>
    </div>`
    
    if (hasValidImages) {
      const placeholder = `__IMAGE_ROW_PLACEHOLDER_${placeholderCounter++}__`
      placeholders.set(placeholder, row)
      return placeholder
    }
    return null
  }

  // Try normal curly braces first
  processed = processed.replace(/\{(\[[^\]]+\])+\}/g, (match) => {
    const imageMatches = match.match(/\[([^\]]+)\]/g) || []
    const result = createImageRow(imageMatches)
    return result || match
  })
  
  // Try HTML encoded curly braces
  processed = processed.replace(/&#123;(\[[^\]]+\])+&#125;/g, (match) => {
    const imageMatches = match.match(/\[([^\]]+)\]/g) || []
    const result = createImageRow(imageMatches)
    return result || match
  })
  
  // Try &lbrace; and &rbrace;
  processed = processed.replace(/&lbrace;(\[[^\]]+\])+&rbrace;/g, (match) => {
    const imageMatches = match.match(/\[([^\]]+)\]/g) || []
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
    // Get scroll measurements
    const scrollWidth = container.scrollWidth
    const clientWidth = container.clientWidth
    const scrollLeft = container.scrollLeft
    
    console.log(`Container ${containerId}:`, {
      scrollWidth,
      clientWidth,
      scrollLeft,
      needsScrolling: scrollWidth > clientWidth
    })
    
    // Check if scrolling is needed at all
    const needsScrolling = scrollWidth > clientWidth
    
    if (!needsScrolling) {
      // If no scrolling needed, hide both indicators
      console.log('No scrolling needed, hiding indicators')
      leftIndicator.style.display = 'none'
      rightIndicator.style.display = 'none'
      return
    }
    
    // If scrolling is needed, show/hide based on scroll position
    const canScrollLeft = scrollLeft > 0
    const canScrollRight = scrollLeft < (scrollWidth - clientWidth - 1) // Add 1px tolerance
    
    console.log('Scroll states:', { canScrollLeft, canScrollRight })
    
    leftIndicator.style.display = canScrollLeft ? 'flex' : 'none'
    rightIndicator.style.display = canScrollRight ? 'flex' : 'none'
  }
}

export default function AIOverview({ text }) {
  if (!text) return null
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState(null) // 'up', 'down', or null
  const limit = 750
  
  const processedText = useMemo(() => {
    // Convert plain text to properly formatted HTML like Google's AI Overview
    if (!text) return ''
    
    // Split into paragraphs and format properly
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim())
    
    let formatted = paragraphs.map(paragraph => {
      // Clean up the paragraph
      let p = paragraph.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ')
      
      // Wrap in paragraph tags
      return `<p>${p}</p>`
    }).join('')
    
    // Process images after paragraph formatting
    return processContent(formatted)
  }, [text])
  
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
        // Initial check - wait for images to load
        const checkIndicators = () => updateScrollIndicators(container.id)
        
        // Check immediately
        checkIndicators()
        
        // Check after images load
        setTimeout(checkIndicators, 100)
        setTimeout(checkIndicators, 500)
        setTimeout(checkIndicators, 1000)
        
        // Add scroll event listener to update indicators
        const scrollHandler = () => updateScrollIndicators(container.id)
        container.addEventListener('scroll', scrollHandler)
        
        // Add resize observer to handle window resize
        const resizeObserver = new ResizeObserver(() => {
          checkIndicators()
        })
        resizeObserver.observe(container)
        
        // Store handlers for cleanup
        container._scrollHandler = scrollHandler
        container._resizeObserver = resizeObserver
      }
    })
    
    return () => {
      containers.forEach(container => {
        if (container.id) {
          if (container._scrollHandler) {
            container.removeEventListener('scroll', container._scrollHandler)
            delete container._scrollHandler
          }
          if (container._resizeObserver) {
            container._resizeObserver.disconnect()
            delete container._resizeObserver
          }
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
        className={`ai-body ${(!expanded && wasTruncated) ? 'ai-body--truncated' : ''}`}
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
