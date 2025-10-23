import React from 'react'
import { mdiStarFourPoints } from '@mdi/js'
import Icon from '@mdi/react'

export default function SimpleAIOverview({ htmlContent }) {
  if (!htmlContent) return null

  return (
    <section style={{ 
      maxWidth: '48rem', 
      margin: '1rem 0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        marginBottom: '0.5rem',
        color: '#666',
        fontSize: '14px'
      }}>
        <Icon path={mdiStarFourPoints} size={1.0} color="#1a73e8" />
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>AI Overview</h2>
      </div>
      
      <div
        style={{
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#000',
          whiteSpace: 'pre-wrap', // This preserves line breaks and spacing
          wordWrap: 'break-word'
        }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </section>
  )
}
