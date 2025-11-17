// Simple cloud storage service for cross-device data sync
// Uses a simple JSON storage API for demonstration

const STORAGE_API_BASE = 'https://api.jsonbin.io/v3/b'
const API_KEY = '$2a$10$8vJ9FX.hs8uYjBin.API.KEY.PLACEHOLDER' // You'll need to get a real API key

class CloudStorageService {
  constructor() {
    this.apiKey = API_KEY
    this.fallbackToLocal = true
  }

  // Get user's bin ID (create if doesn't exist)
  async getUserBinId(username) {
    try {
      const binId = localStorage.getItem(`cloud_bin_${username}`)
      if (binId) return binId

      // Create new bin for user
      const response = await fetch(`${STORAGE_API_BASE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': this.apiKey,
          'X-Bin-Name': `user_data_${username}`
        },
        body: JSON.stringify({
          user: username,
          data: {},
          created: new Date().toISOString()
        })
      })

      if (response.ok) {
        const result = await response.json()
        const newBinId = result.metadata.id
        localStorage.setItem(`cloud_bin_${username}`, newBinId)
        return newBinId
      }
    } catch (error) {
      console.warn('Failed to get/create user bin:', error)
    }
    return null
  }

  // Save user data to cloud
  async saveUserData(username, data) {
    try {
      const binId = await this.getUserBinId(username)
      if (!binId) throw new Error('No bin ID available')

      const payload = {
        user: username,
        data: data,
        lastUpdated: new Date().toISOString()
      }

      const response = await fetch(`${STORAGE_API_BASE}/${binId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': this.apiKey
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        console.log(`Cloud data saved for user: ${username}`)
        return true
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.warn('Failed to save to cloud, using localStorage fallback:', error)
      if (this.fallbackToLocal) {
        // Fallback to localStorage
        try {
          localStorage.setItem(`cloud_backup_${username}`, JSON.stringify(data))
          return true
        } catch (localError) {
          console.error('localStorage fallback also failed:', localError)
          return false
        }
      }
      return false
    }
  }

  // Load user data from cloud
  async loadUserData(username) {
    try {
      const binId = await this.getUserBinId(username)
      if (!binId) throw new Error('No bin ID available')

      const response = await fetch(`${STORAGE_API_BASE}/${binId}/latest`, {
        headers: {
          'X-Master-Key': this.apiKey
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`Cloud data loaded for user: ${username}`)
        return result.record.data || {}
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.warn('Failed to load from cloud, trying localStorage fallback:', error)
      if (this.fallbackToLocal) {
        // Fallback to localStorage
        try {
          const backup = localStorage.getItem(`cloud_backup_${username}`)
          return backup ? JSON.parse(backup) : {}
        } catch (localError) {
          console.error('localStorage fallback also failed:', localError)
          return {}
        }
      }
      return {}
    }
  }

  // Check if cloud storage is available
  async isCloudAvailable() {
    try {
      const response = await fetch(`${STORAGE_API_BASE}`, {
        method: 'HEAD',
        headers: { 'X-Master-Key': this.apiKey }
      })
      return response.ok
    } catch (error) {
      return false
    }
  }
}

// Alternative: Simple GitHub Gist storage (no API key needed for public gists)
class GitHubGistStorage {
  constructor() {
    this.baseUrl = 'https://api.github.com/gists'
  }

  async saveUserData(username, data) {
    try {
      const gistId = localStorage.getItem(`gist_id_${username}`)
      
      const payload = {
        description: `User data for ${username}`,
        public: false,
        files: {
          'user_data.json': {
            content: JSON.stringify({
              user: username,
              data: data,
              lastUpdated: new Date().toISOString()
            }, null, 2)
          }
        }
      }

      let response
      if (gistId) {
        // Update existing gist
        response = await fetch(`${this.baseUrl}/${gistId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        // Create new gist
        response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (response.ok) {
        const result = await response.json()
        if (!gistId) {
          localStorage.setItem(`gist_id_${username}`, result.id)
        }
        console.log(`GitHub Gist data saved for user: ${username}`)
        return true
      }
      return false
    } catch (error) {
      console.warn('GitHub Gist save failed:', error)
      return false
    }
  }

  async loadUserData(username) {
    try {
      const gistId = localStorage.getItem(`gist_id_${username}`)
      if (!gistId) return {}

      const response = await fetch(`${this.baseUrl}/${gistId}`)
      if (response.ok) {
        const gist = await response.json()
        const content = gist.files['user_data.json'].content
        const parsed = JSON.parse(content)
        console.log(`GitHub Gist data loaded for user: ${username}`)
        return parsed.data || {}
      }
      return {}
    } catch (error) {
      console.warn('GitHub Gist load failed:', error)
      return {}
    }
  }
}

// Simple localStorage-based solution with export/import
class LocalStorageWithExport {
  constructor() {
    this.storageKey = 'user_data_export'
  }

  // Generate a shareable code for the user's data
  generateShareCode(username, data) {
    const exportData = {
      user: username,
      data: data,
      timestamp: new Date().toISOString()
    }
    
    // Compress and encode the data
    const jsonString = JSON.stringify(exportData)
    const encoded = btoa(jsonString) // Base64 encode
    
    // Store locally for easy access
    localStorage.setItem(`share_code_${username}`, encoded)
    
    return encoded
  }

  // Import data from a share code
  importFromShareCode(shareCode) {
    try {
      const decoded = atob(shareCode) // Base64 decode
      const importData = JSON.parse(decoded)
      
      return {
        username: importData.user,
        data: importData.data,
        timestamp: importData.timestamp
      }
    } catch (error) {
      console.error('Invalid share code:', error)
      return null
    }
  }

  // Get share code for current user
  getShareCode(username) {
    return localStorage.getItem(`share_code_${username}`)
  }
}

// Export the services
export const cloudStorage = new CloudStorageService()
export const githubStorage = new GitHubGistStorage()
export const localExport = new LocalStorageWithExport()

// Main cloud sync function
export async function syncUserData(username, localData) {
  // Try GitHub Gist first (no API key needed)
  const success = await githubStorage.saveUserData(username, localData)
  if (success) {
    return true
  }
  
  // Fallback to share code system
  const shareCode = localExport.generateShareCode(username, localData)
  console.log(`Share code generated for ${username}:`, shareCode.substring(0, 20) + '...')
  return shareCode
}

export async function loadCloudData(username) {
  // Try GitHub Gist first
  const data = await githubStorage.loadUserData(username)
  if (Object.keys(data).length > 0) {
    return data
  }
  
  // If no cloud data, return empty object
  return {}
}
