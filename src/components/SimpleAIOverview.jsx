import React, { useState, useMemo, useEffect } from 'react'
import { mdiStarFourPoints } from '@mdi/js'
import Icon from '@mdi/react'

function stripTags(html) {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

function cleanGoogleHTML(html) {
  if (!html) return ''
  
  // Remove StartFragment and EndFragment markers
  let cleaned = html.replace(/<!--StartFragment-->|<!--EndFragment-->/g, '')
  
  // Remove problematic inline styles but keep formatting ones
  // Remove background colors, theme colors, and layout styles but keep text formatting
  cleaned = cleaned.replace(/style="[^"]*(?:background-color|color|font-family)[^"]*"/g, (match) => {
    // Keep font-weight, font-size, text-decoration, etc. but remove colors and backgrounds
    let style = match.match(/style="([^"]*)"/)[1]
    
    // Keep only formatting-related styles
    const keepStyles = []
    const styleProps = style.split(';')
    
    for (let prop of styleProps) {
      const trimmed = prop.trim()
      if (trimmed.match(/^(font-weight|font-size|text-decoration|margin|padding|line-height|text-align)/)) {
        keepStyles.push(trimmed)
      }
    }
    
    return keepStyles.length > 0 ? `style="${keepStyles.join('; ')}"` : ''
  })
  
  // Remove Google-specific attributes and classes that might cause issues
  cleaned = cleaned.replace(/(?:data-[^=]*="[^"]*"|jsaction="[^"]*"|jscontroller="[^"]*"|jsuid="[^"]*"|data-hveid="[^"]*"|data-ved="[^"]*"|data-wiz-[^=]*="[^"]*"|data-amic="[^"]*"|data-icl-uuid="[^"]*"|tabindex="[^"]*"|aria-label="[^"]*"|data-animation-[^=]*="[^"]*")/g, '')
  
  // Remove complex interactive elements like buttons with lots of attributes
  cleaned = cleaned.replace(/<button[^>]*>.*?<\/button>/gs, '')
  
  // Remove empty spans and divs that might be left over, but preserve ones with content
  cleaned = cleaned.replace(/<(span|div)[^>]*>\s*<\/(span|div)>/g, '')
  
  // Preserve important HTML formatting elements by converting them to simpler versions
  // Convert <mark> tags to <strong> with highlight class for our CSS to style
  cleaned = cleaned.replace(/<mark[^>]*>/g, '<strong class="highlight">')
  cleaned = cleaned.replace(/<\/mark>/g, '</strong>')
  
  // Clean up multiple spaces and newlines
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  return cleaned
}

function processContent(html) {
  if (!html) return ''
  
  // First clean the Google HTML
  let processed = cleanGoogleHTML(html)
  
  // Use placeholders to prevent double processing
  const placeholders = new Map()
  let placeholderCounter = 0
  
  // Step 1: Handle curly brace grouped images - check for HTML encoded braces too
  
  // Function to create image row
  const createImageRow = (imageMatches) => {
    const containerId = `image-row-${Math.random().toString(36).substr(2, 9)}`
    let row = `<div class="image-row-container">
      <div class="image-row" id="${containerId}">`
    
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
    console.log('- Processing curly brace group:', match)
    const imageMatches = match.match(/\[([^\]]+)\]/g) || []
    console.log('- Found images in group:', imageMatches)
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
      console.log('- Processing individual image:', url)
      return `<div class="image-row-container"><img src="${url}" alt="User provided image" style="max-width: 100%; height: auto; border-radius: 0.5rem; display: block;" /></div>`
    }
    return match // Return original if not an image
  })
  
  // Step 3: Clean up problematic styling from pasted content
  // Remove yellow highlights and replace with blue
  processed = processed.replace(/style="[^"]*background[^"]*yellow[^"]*"/gi, 'style="background-color: rgba(26, 115, 232, 0.2);"')
  processed = processed.replace(/style="[^"]*background-color:\s*#ffff00[^"]*"/gi, 'style="background-color: rgba(26, 115, 232, 0.2);"')
  processed = processed.replace(/style="[^"]*background:\s*yellow[^"]*"/gi, 'style="background-color: rgba(26, 115, 232, 0.2);"')
  
  // Step 4: Convert line breaks to proper HTML
  // First, handle existing HTML content properly
  if (processed.includes('<') && processed.includes('>')) {
    // This looks like HTML content, preserve it but ensure line breaks work
    processed = processed.replace(/\n/g, '<br>')
  } else {
    // This is plain text, convert to proper HTML with paragraphs and line breaks
    processed = processed
      .split('\n\n') // Split on double line breaks for paragraphs
      .map(paragraph => {
        if (paragraph.trim()) {
          // Convert single line breaks within paragraphs to <br>
          const withBreaks = paragraph.replace(/\n/g, '<br>')
          return `<p>${withBreaks}</p>`
        }
        return ''
      })
      .filter(p => p) // Remove empty paragraphs
      .join('')
  }
  
  // Step 5: Replace placeholders with actual content
  placeholders.forEach((content, placeholder) => {
    processed = processed.replace(placeholder, content)
  })
  
  return processed
}

// Global function for scroll indicators
if (typeof window !== 'undefined') {
  window.scrollImageRow = function(containerId, scrollAmount) {
    const container = document.getElementById(containerId)
    if (container) {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
      // Update scroll indicators after scrolling
      setTimeout(() => updateScrollIndicators(containerId), 300)
    }
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
    
    // Check if scrolling is needed at all
    const needsScrolling = scrollWidth > clientWidth
    
    if (!needsScrolling) {
      // If no scrolling needed, hide both indicators
      leftIndicator.style.display = 'none'
      rightIndicator.style.display = 'none'
      return
    }
    
    // If scrolling is needed, show/hide based on scroll position
    const canScrollLeft = scrollLeft > 0
    const canScrollRight = scrollLeft < (scrollWidth - clientWidth - 1) // Add 1px tolerance
    
    leftIndicator.style.display = canScrollLeft ? 'flex' : 'none'
    rightIndicator.style.display = canScrollRight ? 'flex' : 'none'
  }
}

export default function SimpleAIOverview({ htmlContent }) {
  console.log('SimpleAIOverview DEBUG:')
  console.log('- htmlContent:', htmlContent)
  console.log('- htmlContent type:', typeof htmlContent)
  console.log('- htmlContent length:', htmlContent?.length)
  
  if (!htmlContent) {
    console.log('- No htmlContent, returning null')
    return null
  }
  
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState(null) // 'up', 'down', or null
  const limit = 600 // Normal Google AI Overview length

  // Process the content to handle formatting and images
  const processedContent = useMemo(() => {
    if (!htmlContent) return ''
    const processed = processContent(htmlContent)
    console.log('- processedContent:', processed)
    console.log('- processedContent length:', processed.length)
    return processed
  }, [htmlContent])

  // Check if text needs truncation
  const wasTruncated = useMemo(() => {
    const plain = stripTags(htmlContent)
    const cleanedPlain = stripTags(processedContent) // Also check processed content
    const originalLength = plain.trim().length
    const processedLength = cleanedPlain.trim().length
    
    // Use the longer of the two to determine truncation
    const effectiveLength = Math.max(originalLength, processedLength)
    const shouldTruncate = effectiveLength > limit
    
    console.log('- Checking truncation:')
    console.log('  - Original plain text length:', originalLength)
    console.log('  - Processed plain text length:', processedLength)
    console.log('  - Effective length:', effectiveLength)
    console.log('  - Limit:', limit)
    console.log('  - Should truncate:', shouldTruncate)
    
    return shouldTruncate
  }, [htmlContent, processedContent, limit])

  // Create truncated version
  const truncatedContent = useMemo(() => {
    if (!wasTruncated || expanded) {
      console.log('- Not truncating: wasTruncated =', wasTruncated, 'expanded =', expanded)
      return processedContent
    }
    
    const plain = stripTags(htmlContent)
    console.log('- Plain text length:', plain.length, 'limit:', limit)
    
    if (plain.length <= limit) {
      console.log('- Content within limit, returning full content')
      return processedContent
    }
    
    // Better truncation - find a good breaking point based on plain text length
    const plainText = stripTags(htmlContent)
    const targetPlainLength = limit
    
    // Find approximately where we should cut in the HTML to get the target plain text length
    let estimatedHtmlPosition = Math.floor((targetPlainLength / plainText.length) * htmlContent.length)
    
    // Look for good breaking points around this position
    const searchStart = Math.max(0, estimatedHtmlPosition - 500)
    const searchEnd = Math.min(htmlContent.length, estimatedHtmlPosition + 500)
    const searchArea = htmlContent.substring(searchStart, searchEnd)
    
    // Try to find good breaking points in order of preference
    const lastSentence = searchArea.lastIndexOf('. ')
    const lastParagraph = searchArea.lastIndexOf('</p>')
    const lastListItem = searchArea.lastIndexOf('</li>')
    const lastHeading = searchArea.lastIndexOf('</h')
    
    // Find the best breaking point
    let breakPoint = estimatedHtmlPosition
    
    if (lastSentence > -1) {
      breakPoint = searchStart + lastSentence + 2 // Include the '. '
      console.log('- Truncating at sentence end:', breakPoint)
    } else if (lastParagraph > -1) {
      breakPoint = searchStart + lastParagraph + 4 // Include the '</p>'
      console.log('- Truncating at paragraph end:', breakPoint)
    } else if (lastListItem > -1) {
      breakPoint = searchStart + lastListItem + 5 // Include the '</li>'
      console.log('- Truncating at list item end:', breakPoint)
    } else if (lastHeading > -1) {
      // Find the end of the heading tag
      const headingEnd = htmlContent.indexOf('>', searchStart + lastHeading)
      if (headingEnd > searchStart + lastHeading) {
        breakPoint = headingEnd + 1
        console.log('- Truncating at heading end:', breakPoint)
      }
    } else {
      console.log('- Using estimated position truncation:', breakPoint)
    }
    
    const finalTruncated = htmlContent.substring(0, breakPoint)
    const processed = processContent(finalTruncated)
    
    // Double-check that we actually truncated - if not, force truncation
    const processedPlain = stripTags(processed)
    if (processedPlain.trim().length > limit * 1.2) {
      console.log('- Smart truncation failed, forcing character-based truncation')
      // Force truncation at character limit
      const forcedTruncated = htmlContent.substring(0, limit)
      const forcedProcessed = processContent(forcedTruncated)
      console.log('- Forced truncated content length:', stripTags(forcedProcessed).length)
      return forcedProcessed
    }
    
    console.log('- Final truncated content length:', processedPlain.length)
    return processed
  }, [htmlContent, processedContent, wasTruncated, expanded, limit])

  // Update scroll indicators when component mounts or content changes
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
  }, [processedContent])

  // Handle feedback clicks
  const handleFeedback = (type) => {
    if (feedback === type) {
      setFeedback(null)
    } else {
      setFeedback(type)
    }
    console.log(`AI Overview feedback: ${type === null ? 'removed' : type}`)
  }

  console.log('- RENDER DEBUG:')
  console.log('  - wasTruncated:', wasTruncated)
  console.log('  - expanded:', expanded)
  console.log('  - CSS class will be:', `ai-body ${(!expanded && wasTruncated) ? 'ai-body--truncated' : ''}`)
  console.log('  - Content being rendered:', expanded ? 'processedContent' : 'truncatedContent')
  console.log('  - Show more button will show:', (!expanded && wasTruncated))

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
        dangerouslySetInnerHTML={{ __html: expanded ? processedContent : truncatedContent }}
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
