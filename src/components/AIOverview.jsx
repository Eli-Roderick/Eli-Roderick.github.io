import React from 'react'

export default function AIOverview({ text }) {
  if (!text) return null
  return (
    <section className="ai-card">
      <div className="ai-header">AI Overview</div>
      <div className="ai-body whitespace-pre-wrap">{text}</div>
    </section>
  )
}
