import React from 'react'

export default function EnvDebug() {
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      background: 'white',
      border: '2px solid red',
      padding: '10px',
      zIndex: 99999,
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <h4>Environment Debug:</h4>
      <div>NODE_ENV: {process.env.NODE_ENV}</div>
      <div>REACT_APP_SUPABASE_URL: {process.env.REACT_APP_SUPABASE_URL || 'MISSING'}</div>
      <div>REACT_APP_SUPABASE_ANON_KEY: {process.env.REACT_APP_SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING'}</div>
      <div>All REACT_APP vars:</div>
      <pre>{JSON.stringify(
        Object.keys(process.env)
          .filter(key => key.startsWith('REACT_APP_'))
          .reduce((obj, key) => {
            obj[key] = key.includes('KEY') ? 'PRESENT' : process.env[key]
            return obj
          }, {}),
        null, 2
      )}</pre>
    </div>
  )
}
