import React, { useRef } from 'react'

export default function SimpleTextEditor({ value, onChange, placeholder }) {
  const textareaRef = useRef(null)

  const handleChange = (e) => {
    onChange(e.target.value)
  }

  return (
    <textarea
      ref={textareaRef}
      value={value || ''}
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
