// Utility functions for safe operations and error prevention

/**
 * Safely call a function with error handling
 * @param {Function} fn - Function to call
 * @param {Array} args - Arguments to pass to function
 * @param {*} fallback - Fallback value if function fails
 * @returns {*} Function result or fallback
 */
export const safeCall = (fn, args = [], fallback = null) => {
  try {
    if (typeof fn !== 'function') {
      console.warn('safeCall: Expected function, got:', typeof fn)
      return fallback
    }
    return fn(...args)
  } catch (error) {
    console.error('safeCall error:', error)
    return fallback
  }
}

/**
 * Safely access nested object properties
 * @param {Object} obj - Object to access
 * @param {string} path - Dot-notation path (e.g., 'user.profile.name')
 * @param {*} fallback - Fallback value if path doesn't exist
 * @returns {*} Property value or fallback
 */
export const safeGet = (obj, path, fallback = null) => {
  try {
    if (!obj || typeof obj !== 'object') return fallback
    
    const keys = path.split('.')
    let result = obj
    
    for (const key of keys) {
      if (result === null || result === undefined || !(key in result)) {
        return fallback
      }
      result = result[key]
    }
    
    return result
  } catch (error) {
    console.error('safeGet error:', error)
    return fallback
  }
}

/**
 * Safely parse JSON with fallback
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
export const safeJsonParse = (jsonString, fallback = null) => {
  try {
    if (typeof jsonString !== 'string') return fallback
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('safeJsonParse error:', error)
    return fallback
  }
}

/**
 * Safely access localStorage with fallback
 * @param {string} key - localStorage key
 * @param {*} fallback - Fallback value if access fails
 * @returns {*} Stored value or fallback
 */
export const safeLocalStorageGet = (key, fallback = null) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback
    const item = localStorage.getItem(key)
    return item !== null ? JSON.parse(item) : fallback
  } catch (error) {
    console.error('safeLocalStorageGet error:', error)
    return fallback
  }
}

/**
 * Safely set localStorage with error handling
 * @param {string} key - localStorage key
 * @param {*} value - Value to store
 * @returns {boolean} Success status
 */
export const safeLocalStorageSet = (key, value) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error('safeLocalStorageSet error:', error)
    return false
  }
}

/**
 * Validate props and provide defaults
 * @param {Object} props - Props object to validate
 * @param {Object} schema - Validation schema with defaults
 * @returns {Object} Validated props with defaults applied
 */
export const validateProps = (props = {}, schema = {}) => {
  const validated = {}
  
  for (const [key, config] of Object.entries(schema)) {
    const { type, required = false, default: defaultValue } = config
    const value = props[key]
    
    // Check if required prop is missing
    if (required && (value === undefined || value === null)) {
      console.error(`Missing required prop: ${key}`)
      validated[key] = defaultValue
      continue
    }
    
    // Use default if value is undefined
    if (value === undefined) {
      validated[key] = defaultValue
      continue
    }
    
    // Type checking
    if (type && value !== null && value !== undefined) {
      const actualType = Array.isArray(value) ? 'array' : typeof value
      if (actualType !== type) {
        console.warn(`Prop ${key} expected ${type}, got ${actualType}`)
        validated[key] = defaultValue
        continue
      }
    }
    
    validated[key] = value
  }
  
  return validated
}

/**
 * Create a safe event handler that won't crash on errors
 * @param {Function} handler - Event handler function
 * @param {string} name - Handler name for debugging
 * @returns {Function} Safe event handler
 */
export const safeEventHandler = (handler, name = 'handler') => {
  return (...args) => {
    try {
      if (typeof handler !== 'function') {
        console.warn(`${name} is not a function:`, typeof handler)
        return
      }
      return handler(...args)
    } catch (error) {
      console.error(`Error in ${name}:`, error)
    }
  }
}

/**
 * Log errors to console and localStorage for debugging
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @param {Object} additionalInfo - Additional debugging info
 */
export const logError = (error, context = 'Unknown', additionalInfo = {}) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    message: error.message,
    stack: error.stack,
    ...additionalInfo
  }
  
  console.error(`Error in ${context}:`, errorInfo)
  
  // Store in localStorage for debugging
  try {
    const logs = safeLocalStorageGet('error_logs', [])
    logs.push(errorInfo)
    
    // Keep only last 20 errors
    if (logs.length > 20) {
      logs.splice(0, logs.length - 20)
    }
    
    safeLocalStorageSet('error_logs', logs)
  } catch (logError) {
    console.warn('Failed to store error log:', logError)
  }
}
