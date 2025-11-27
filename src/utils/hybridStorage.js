// Hybrid storage system - saves to both localStorage and Supabase
import { supabase, getCurrentUser } from './supabase'
import { setUserData, getUserData } from './userData'

// Direct Supabase save functions that work with proper authentication
const saveCustomSearchPagesToSupabase = async (pages) => {
  try {
    console.log('🔍 saveCustomSearchPagesToSupabase called with:', { pageCount: Object.keys(pages).length })
    
    // Get current authenticated user
    const user = await getCurrentUser()
    if (!user) {
      console.error('No authenticated user found')
      return false
    }
    
    console.log('🔍 Using authenticated user:', user.id)

    // Delete existing pages for this user
    await supabase
      .from('custom_search_pages')
      .delete()
      .eq('user_id', user.id)

    // Insert new pages if any exist
    if (Object.keys(pages).length > 0) {
      const pageData = Object.entries(pages).map(([queryKey, page]) => ({
        user_id: user.id,
        query_key: queryKey,
        search_key: page.key,
        query: page.query,
        display_name: page.displayName
      }))

      const { error } = await supabase
        .from('custom_search_pages')
        .insert(pageData)

      if (error) {
        console.error('Error saving custom search pages:', error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error in saveCustomSearchPagesToSupabase:', error)
    return false
  }
}

const saveAIOverviewsToSupabase = async (overviews) => {
  try {
    // Get current authenticated user
    const user = await getCurrentUser()
    if (!user) {
      console.error('No authenticated user found')
      return false
    }

    // Delete existing AI overviews for this user
    await supabase
      .from('ai_overviews')
      .delete()
      .eq('user_id', user.id)

    // Insert new overviews if any exist
    if (overviews.length > 0) {
      const overviewData = overviews.map(overview => ({
        user_id: user.id,
        title: overview.title,
        content: overview.content
      }))

      const { error } = await supabase
        .from('ai_overviews')
        .insert(overviewData)

      if (error) {
        console.error('Error saving AI overviews:', error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error in saveAIOverviewsToSupabase:', error)
    return false
  }
}

// Save to both localStorage and Supabase
export const hybridSave = async (key, data) => {
  // Always save to localStorage first (for immediate access)
  const localStorageSuccess = setUserData(key, data)
  
  // Try to save to Supabase as backup
  let supabaseSuccess = false
  try {
    switch (key) {
      case 'custom_search_pages':
        console.log('Saving custom search pages to Supabase...', Object.keys(data).length, 'pages')
        supabaseSuccess = await saveCustomSearchPagesToSupabase(data)
        break
      case 'ai_overviews':
        console.log('Saving AI overviews to Supabase...', data.length, 'items')
        supabaseSuccess = await saveAIOverviewsToSupabase(data)
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
  
  // If no local data, try Supabase (using cloudData functions)
  try {
    let supabaseData = null
    switch (key) {
      case 'custom_search_pages':
        // Import dynamically to avoid circular dependencies
        const { loadCustomSearchPages } = await import('./cloudData')
        supabaseData = await loadCustomSearchPages()
        break
      case 'ai_overviews':
        const { loadAIOverviews } = await import('./cloudData')
        supabaseData = await loadAIOverviews()
        break
      default:
        console.log(`Supabase load not yet implemented for ${key}`)
    }
    
    if (supabaseData && (typeof supabaseData === 'object' ? Object.keys(supabaseData).length > 0 : supabaseData.length > 0)) {
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
    console.log('🔍 Testing supabase connection...')
    
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1)
    
    console.log('🔍 Query result:', { data, error })
    
    if (error) {
      console.error('🔍 Supabase connection error:', error)
      return { success: false, error: error.message }
    }
    
    console.log('🔍 Supabase connection successful!')
    return { success: true, message: 'Connected successfully!' }
  } catch (error) {
    console.error('🔍 Supabase connection exception:', error)
    return { success: false, error: error.message }
  }
}
