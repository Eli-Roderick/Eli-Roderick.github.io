// Hybrid storage system - saves to both localStorage and Supabase
import { supabase } from './supabase'
import { setUserData, getUserData } from './userData'

// Direct Supabase save functions that work with our current user system
const saveCustomSearchPagesToSupabase = async (pages, userEmail) => {
  try {
    // First, ensure user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', userEmail)
      .single()

    let userId
    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it with a generated UUID
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: crypto.randomUUID(),
          username: userEmail
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Error creating user profile:', insertError)
        return false
      }
      userId = newProfile.id
    } else if (profileError) {
      console.error('Error checking user profile:', profileError)
      return false
    } else {
      userId = profile.id
    }

    // Delete existing pages for this user
    await supabase
      .from('custom_search_pages')
      .delete()
      .eq('user_id', userId)

    // Insert new pages if any exist
    if (Object.keys(pages).length > 0) {
      const pageData = Object.entries(pages).map(([queryKey, page]) => ({
        user_id: userId,
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

const saveAIOverviewsToSupabase = async (overviews, userEmail) => {
  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', userEmail)
      .single()

    if (profileError) {
      console.error('Error getting user profile for AI overviews:', profileError)
      return false
    }

    const userId = profile.id

    // Delete existing AI overviews for this user
    await supabase
      .from('ai_overviews')
      .delete()
      .eq('user_id', userId)

    // Insert new overviews if any exist
    if (overviews.length > 0) {
      const overviewData = overviews.map(overview => ({
        user_id: userId,
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
export const hybridSave = async (key, data, userId) => {
  // Always save to localStorage first (for immediate access)
  const localStorageSuccess = setUserData(key, data)
  
  // Try to save to Supabase as backup
  let supabaseSuccess = false
  try {
    switch (key) {
      case 'custom_search_pages':
        console.log('Saving custom search pages to Supabase...', Object.keys(data).length, 'pages')
        supabaseSuccess = await saveCustomSearchPagesToSupabase(data, userId)
        break
      case 'ai_overviews':
        console.log('Saving AI overviews to Supabase...', data.length, 'items')
        supabaseSuccess = await saveAIOverviewsToSupabase(data, userId)
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
