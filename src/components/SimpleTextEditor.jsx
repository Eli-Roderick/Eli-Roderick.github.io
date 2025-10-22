import React, { useState, useRef, useEffect } from 'react'

export default function SimpleTextEditor({ value, onChange, placeholder }) {
  const [internalValue, setInternalValue] = useState(value || '')
  const textareaRef = useRef(null)

  // Sync with external value changes
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value || '')
    }
  }, [value])

  const handleChange = (e) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    
    // Debounce the external onChange to prevent issues
    clearTimeout(window.textEditorTimeout)
    window.textEditorTimeout = setTimeout(() => {
      onChange(newValue)
    }, 100)
  }

  return (
    <textarea
      ref={textareaRef}
      value={internalValue}
      onChange={handleChange}
      placeholder={placeholder}
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
        resize: 'vertical'
      }}
    />
  )
}
