// User-specific data management utility
// Provides functions to store and retrieve data per user

export class UserDataManager {
  constructor(currentUser) {
    this.currentUser = currentUser
  }

  // Get a key prefixed with the current user
  getUserKey(key) {
    if (!this.currentUser) return key
    return `user_${this.currentUser}_${key}`
  }

  // Set user-specific data
  setUserData(key, data) {
    if (!this.currentUser) return false
    
    try {
      const userKey = this.getUserKey(key)
      localStorage.setItem(userKey, JSON.stringify(data))
      return true
    } catch (error) {
      console.warn(`Failed to save user data for ${key}:`, error)
      return false
    }
  }

  // Get user-specific data
  getUserData(key, defaultValue = null) {
    if (!this.currentUser) return defaultValue
    
    try {
      const userKey = this.getUserKey(key)
      const saved = localStorage.getItem(userKey)
      return saved ? JSON.parse(saved) : defaultValue
    } catch (error) {
      console.warn(`Failed to load user data for ${key}:`, error)
      return defaultValue
    }
  }

  // Remove user-specific data
  removeUserData(key) {
    if (!this.currentUser) return false
    
    try {
      const userKey = this.getUserKey(key)
      localStorage.removeItem(userKey)
      return true
    } catch (error) {
      console.warn(`Failed to remove user data for ${key}:`, error)
      return false
    }
  }

  // Get all keys for current user
  getUserKeys() {
    if (!this.currentUser) return []
    
    const prefix = `user_${this.currentUser}_`
    const keys = []
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(prefix)) {
          keys.push(key.substring(prefix.length))
        }
      }
    } catch (error) {
      console.warn('Failed to get user keys:', error)
    }
    
    return keys
  }

  // Clear all data for current user
  clearUserData() {
    if (!this.currentUser) return false
    
    const keys = this.getUserKeys()
    let success = true
    
    keys.forEach(key => {
      if (!this.removeUserData(key)) {
        success = false
      }
    })
    
    return success
  }

  // Export user data for backup/transfer
  exportUserData() {
    if (!this.currentUser) return null
    
    const keys = this.getUserKeys()
    const userData = {
      user: this.currentUser,
      timestamp: new Date().toISOString(),
      data: {}
    }
    
    keys.forEach(key => {
      userData.data[key] = this.getUserData(key)
    })
    
    return userData
  }

  // Import user data from backup
  importUserData(userData) {
    if (!this.currentUser || !userData || !userData.data) return false
    
    let success = true
    
    Object.entries(userData.data).forEach(([key, value]) => {
      if (!this.setUserData(key, value)) {
        success = false
      }
    })
    
    return success
  }

  // Get data size for current user (approximate)
  getUserDataSize() {
    if (!this.currentUser) return 0
    
    const keys = this.getUserKeys()
    let totalSize = 0
    
    keys.forEach(key => {
      try {
        const userKey = this.getUserKey(key)
        const data = localStorage.getItem(userKey)
        if (data) {
          totalSize += data.length
        }
      } catch (error) {
        // Ignore errors for size calculation
      }
    })
    
    return totalSize
  }
}

// Global functions for easy access
let currentUserDataManager = null

export function initializeUserData(username) {
  currentUserDataManager = new UserDataManager(username)
  return currentUserDataManager
}

export function getCurrentUserData() {
  return currentUserDataManager
}

export function setUserData(key, data) {
  return currentUserDataManager?.setUserData(key, data) || false
}

export function getUserData(key, defaultValue = null) {
  return currentUserDataManager?.getUserData(key, defaultValue) || defaultValue
}

export function removeUserData(key) {
  return currentUserDataManager?.removeUserData(key) || false
}

export function clearAllUserData() {
  return currentUserDataManager?.clearUserData() || false
}

export function exportUserData() {
  return currentUserDataManager?.exportUserData() || null
}

export function importUserData(userData) {
  return currentUserDataManager?.importUserData(userData) || false
}

// Migration helper - move existing localStorage data to user-specific keys
export function migrateExistingData(username, keysToMigrate = []) {
  if (!username || keysToMigrate.length === 0) return false
  
  const userDataManager = new UserDataManager(username)
  let migrated = 0
  
  keysToMigrate.forEach(key => {
    try {
      const existingData = localStorage.getItem(key)
      if (existingData) {
        // Save to user-specific key
        userDataManager.setUserData(key, JSON.parse(existingData))
        // Remove old global key
        localStorage.removeItem(key)
        migrated++
      }
    } catch (error) {
      console.warn(`Failed to migrate ${key}:`, error)
    }
  })
  
  return migrated
}
