import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    })

    // Log to localStorage for debugging
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        props: this.props.componentName || 'Unknown'
      }
      
      const existingLogs = JSON.parse(localStorage.getItem('error_logs') || '[]')
      existingLogs.push(errorLog)
      
      // Keep only last 10 errors
      if (existingLogs.length > 10) {
        existingLogs.splice(0, existingLogs.length - 10)
      }
      
      localStorage.setItem('error_logs', JSON.stringify(existingLogs))
    } catch (logError) {
      console.warn('Failed to log error to localStorage:', logError)
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div style={{
          padding: '2rem',
          border: '2px solid #dc3545',
          borderRadius: '8px',
          backgroundColor: '#fff5f5',
          color: '#721c24',
          textAlign: 'center',
          margin: '1rem'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#dc3545' }}>
            🚨 Something went wrong
          </h3>
          <p style={{ margin: '0 0 1rem 0' }}>
            {this.props.componentName || 'A component'} encountered an error and couldn't render properly.
          </p>
          <details style={{ textAlign: 'left', marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Technical Details (Click to expand)
            </summary>
            <pre style={{ 
              marginTop: '0.5rem', 
              padding: '1rem', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '200px'
            }}>
              {this.state.error && this.state.error.toString()}
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>
          <div style={{ marginTop: '1rem' }}>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null })
                if (this.props.onRetry) {
                  this.props.onRetry()
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '0.5rem'
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
