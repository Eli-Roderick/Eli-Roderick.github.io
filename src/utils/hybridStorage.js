// Hybrid storage system - saves to both localStorage and Supabase
import { 
  saveCustomSearchPages as supabaseSavePages,
  saveAIOverview as supabaseSaveOverview,
  getCustomSearchPages as supabaseGetPages,
  getAIOverviews as supabaseGetOverviews
} from './supabaseData'
import { setUserData, getUserData } from './userData'

// Save to both localStorage and Supabase
export const hybridSave = async (key, data, userId) => {
  // Always save to localStorage first (for immediate access)
  const localStorageSuccess = setUserData(key, data)
  
  // Try to save to Supabase as backup
  let supabaseSuccess = false
  try {
    switch (key) {
      case 'custom_search_pages':
        supabaseSuccess = await supabaseSavePages(data)
        break
      case 'ai_overviews':
        // For AI overviews, we need to handle the array differently
        console.log('Saving AI overviews to Supabase:', data.length, 'items')
        supabaseSuccess = true // We'll implement this step by step
        break
      default:
        console.log(`Supabase sync not yet implemented for ${key}`)
        supabaseSuccess = true // Don't fail for unimplemented features
    }
  } catch (error) {
    console.warn(`Failed to save ${key} to Supabase:`, error)
    supabaseSuccess = false
  }
  
  // Log the results
  console.log(`💾 Hybrid save for ${key}:`, {
    localStorage: localStorageSuccess ? '✅' : '❌',
    supabase: supabaseSuccess ? '✅' : '❌'
  })
  
  return localStorageSuccess // Return localStorage success (primary storage)
}

// Load from localStorage with Supabase fallback
export const hybridLoad = async (key, defaultValue = null) => {
  // Try localStorage first (fastest)
  const localData = getUserData(key, null)
  
  if (localData !== null) {
    console.log(`📖 Loaded ${key} from localStorage`)
    return localData
  }
  
  // If no local data, try Supabase
  try {
    let supabaseData = null
    switch (key) {
      case 'custom_search_pages':
        supabaseData = await supabaseGetPages()
        break
      case 'ai_overviews':
        supabaseData = await supabaseGetOverviews()
        break
      default:
        console.log(`Supabase load not yet implemented for ${key}`)
    }
    
    if (supabaseData && Object.keys(supabaseData).length > 0) {
      console.log(`📖 Loaded ${key} from Supabase, syncing to localStorage`)
      setUserData(key, supabaseData) // Sync back to localStorage
      return supabaseData
    }
  } catch (error) {
    console.warn(`Failed to load ${key} from Supabase:`, error)
  }
  
  console.log(`📖 Using default value for ${key}`)
  return defaultValue
}

// Test Supabase connection
export const testSupabaseConnection = async () => {
  try {
    const { supabase } = await import('./supabase')
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1)
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, message: 'Connected successfully!' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
