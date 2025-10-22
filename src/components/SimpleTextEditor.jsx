import React, { useRef, useEffect } from 'react'

export default function SimpleTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    
    // Get pasted content as HTML
    const clipboardData = e.clipboardData || window.clipboardData
    const htmlData = clipboardData.getData('text/html')
    const textData = clipboardData.getData('text/plain')
    
    // Use HTML if available, otherwise convert plain text to HTML with line breaks
    let content = htmlData || textData.replace(/\n/g, '<br>')
    
    // Insert the content
    document.execCommand('insertHTML', false, content)
    
    // Trigger change
    handleInput()
  }

  return (
    <div
      ref={editorRef}
      contentEditable
      onInput={handleInput}
      onPaste={handlePaste}
      data-placeholder={placeholder}
      style={{
        width: '100%',
        minHeight: '200px',
        maxHeight: '300px',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        padding: '12px',
        backgroundColor: 'var(--card-bg)',
        color: 'var(--text)',
        fontSize: '14px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        overflow: 'auto',
        outline: 'none',
        lineHeight: '1.5'
      }}
      dangerouslySetInnerHTML={{ __html: value || '' }}
    />
  )
}
