import React, { useRef, useEffect } from 'react'

export default function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const handlePaste = (e) => {
    e.preventDefault()
    
    // Get the HTML from clipboard - this preserves ALL formatting and links
    const clipboardData = e.clipboardData || window.clipboardData
    let pastedHTML = clipboardData.getData('text/html')
    
    // If no HTML, get plain text and convert line breaks
    if (!pastedHTML) {
      const plainText = clipboardData.getData('text/plain')
      pastedHTML = plainText.replace(/\n/g, '<br>')
    }
    
    // Simple sanitization - remove only dangerous tags
    const cleanHTML = pastedHTML
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/<object[^>]*>.*?<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
    
    // Insert the cleaned HTML
    document.execCommand('insertHTML', false, cleanHTML)
    
    // Update the parent component
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning={true}
      onPaste={handlePaste}
      onInput={handleInput}
      style={{
        width: '100%',
        minHeight: '200px',
        maxHeight: '400px',
        padding: '12px',
        border: '2px solid #ccc',
        borderRadius: '8px',
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        lineHeight: '1.5',
        overflow: 'auto',
        outline: 'none',
        backgroundColor: 'white',
        color: 'black'
      }}
      data-placeholder={!value ? placeholder : ''}
    />
  )
}
