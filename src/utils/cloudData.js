// Complete Cloud Data Layer - Replaces ALL localStorage operations
// Every function here corresponds to a localStorage operation in the original code

import { supabase, getCurrentUser, ensureUserProfile } from './supabase'

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const getCurrentUserId = async () => {
  try {
    const user = await getCurrentUser()
    if (!user) return null
    
    // Ensure user profile exists
    await ensureUserProfile(user)
    return user.id
  } catch (error) {
    console.error('Error getting current user ID:', error)
    return null
  }
}

// ============================================================================
// CUSTOM SEARCH PAGES (replaces custom_search_pages localStorage)
// ============================================================================

export const saveCustomSearchPages = async (pages) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    // Delete existing pages for this user
    await supabase
      .from('custom_search_pages')
      .delete()
      .eq('user_id', userId)

    // Insert new pages
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

    console.log(`✅ Saved ${Object.keys(pages).length} custom search pages to cloud`)
    return true
  } catch (error) {
    console.error('Error in saveCustomSearchPages:', error)
    return false
  }
}

export const loadCustomSearchPages = async () => {
  const userId = await getCurrentUserId()
  if (!userId) return {}

  try {
    const { data, error } = await supabase
      .from('custom_search_pages')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error loading custom search pages:', error)
      return {}
    }

    // Convert to expected format
    const pages = {}
    data.forEach(page => {
      pages[page.query_key] = {
        key: page.search_key,
        query: page.query,
        displayName: page.display_name
      }
    })

    console.log(`📖 Loaded ${Object.keys(pages).length} custom search pages from cloud`)
    return pages
  } catch (error) {
    console.error('Error in loadCustomSearchPages:', error)
    return {}
  }
}

// ============================================================================
// AI OVERVIEWS (replaces ai_overviews localStorage)
// ============================================================================

export const saveAIOverviews = async (overviews) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    // Delete existing overviews
    await supabase
      .from('ai_overviews')
      .delete()
      .eq('user_id', userId)

    // Insert new overviews
    if (overviews.length > 0) {
      const overviewData = overviews.map(overview => ({
        id: overview.id, // Preserve the original ID for updates
        user_id: userId,
        title: overview.title,
        content: overview.content
      }))

      const { error } = await supabase
        .from('ai_overviews')
        .upsert(overviewData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error('Error saving AI overviews:', error)
        return false
      }
    }

    console.log(`✅ Saved ${overviews.length} AI overviews to cloud (using upsert for updates)`)
    return true
  } catch (error) {
    console.error('Error in saveAIOverviews:', error)
    return false
  }
}

export const loadAIOverviews = async () => {
  const userId = await getCurrentUserId()
  if (!userId) return []

  try {
    const { data, error } = await supabase
      .from('ai_overviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading AI overviews:', error)
      return []
    }

    const overviews = data.map(overview => ({
      id: overview.id,
      title: overview.title,
      content: overview.content,
      createdAt: overview.created_at
    }))

    console.log(`📖 Loaded ${overviews.length} AI overviews from cloud`)
    return overviews
  } catch (error) {
    console.error('Error in loadAIOverviews:', error)
    return []
  }
}

// ============================================================================
// CURRENT AI TEXT (replaces ai_overview_text localStorage)
// ============================================================================

export const saveCurrentAIText = async (content) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('current_ai_text')
      .upsert({
        user_id: userId,
        content: content
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Error saving current AI text:', error)
      return false
    }

    console.log(`✅ Saved current AI text to cloud (${content.length} chars)`)
    return true
  } catch (error) {
    console.error('Error in saveCurrentAIText:', error)
    return false
  }
}

export const loadCurrentAIText = async () => {
  const userId = await getCurrentUserId()
  if (!userId) return ''

  try {
    const { data, error } = await supabase
      .from('current_ai_text')
      .select('content')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // No current AI text found
      return ''
    } else if (error) {
      console.error('Error loading current AI text:', error)
      return ''
    }

    console.log(`📖 Loaded current AI text from cloud (${data.content.length} chars)`)
    return data.content
  } catch (error) {
    console.error('Error in loadCurrentAIText:', error)
    return ''
  }
}

// ============================================================================
// SEARCH RESULT ASSIGNMENTS (replaces search_result_assignments localStorage)
// ============================================================================

export const saveSearchResultAssignments = async (assignments) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    // Delete existing assignments
    await supabase
      .from('search_result_assignments')
      .delete()
      .eq('user_id', userId)

    // Insert new assignments
    if (Object.keys(assignments).length > 0) {
      const assignmentData = Object.entries(assignments).map(([searchType, aiOverviewId]) => ({
        user_id: userId,
        search_type: searchType,
        ai_overview_id: aiOverviewId
      }))

      const { error } = await supabase
        .from('search_result_assignments')
        .insert(assignmentData)

      if (error) {
        console.error('Error saving search result assignments:', error)
        return false
      }
    }

    console.log(`✅ Saved ${Object.keys(assignments).length} search result assignments to cloud`)
    return true
  } catch (error) {
    console.error('Error in saveSearchResultAssignments:', error)
    return false
  }
}

export const loadSearchResultAssignments = async () => {
  const userId = await getCurrentUserId()
  if (!userId) return {}

  try {
    const { data, error } = await supabase
      .from('search_result_assignments')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error loading search result assignments:', error)
      return {}
    }

    // Convert to expected format
    const assignments = {}
    data.forEach(assignment => {
      assignments[assignment.search_type] = assignment.ai_overview_id
    })

    console.log(`📖 Loaded ${Object.keys(assignments).length} search result assignments from cloud`)
    return assignments
  } catch (error) {
    console.error('Error in loadSearchResultAssignments:', error)
    return {}
  }
}

// ============================================================================
// CUSTOM SEARCH RESULTS (replaces custom_search_results localStorage)
// ============================================================================

export const saveCustomSearchResults = async (results) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    // For search results, we use delete/insert approach since they don't have 
    // persistent IDs in the current system and are managed as complete sets per search type
    
    // Get all search types that need to be updated
    const searchTypes = Object.keys(results)
    
    // Delete existing results for these search types only
    if (searchTypes.length > 0) {
      await supabase
        .from('custom_search_results')
        .delete()
        .eq('user_id', userId)
        .in('search_type', searchTypes)
    }

    // Insert new results with generated IDs
    const allResults = []
    Object.entries(results).forEach(([searchType, searchResults]) => {
      searchResults.forEach((result, index) => {
        allResults.push({
          user_id: userId,
          search_type: searchType,
          title: result.title,
          url: result.url,
          snippet: result.snippet || '',
          favicon: result.favicon || '',
          display_order: index
        })
      })
    })

    if (allResults.length > 0) {
      const { error } = await supabase
        .from('custom_search_results')
        .insert(allResults)

      if (error) {
        console.error('Error saving custom search results:', error)
        return false
      }
    }

    console.log(`✅ Saved ${allResults.length} custom search results to cloud`)
    return true
  } catch (error) {
    console.error('Error in saveCustomSearchResults:', error)
    return false
  }
}

export const loadCustomSearchResults = async () => {
  const userId = await getCurrentUserId()
  if (!userId) return {}

  try {
    const { data, error } = await supabase
      .from('custom_search_results')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error loading custom search results:', error)
      return {}
    }

    // Group by search_type
    const results = {}
    data.forEach(result => {
      if (!results[result.search_type]) {
        results[result.search_type] = []
      }
      results[result.search_type].push({
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        favicon: result.favicon
      })
    })

    const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0)
    console.log(`📖 Loaded ${totalResults} custom search results from cloud`)
    return results
  } catch (error) {
    console.error('Error in loadCustomSearchResults:', error)
    return {}
  }
}

// ============================================================================
// RESULT IMAGES (replaces result_images localStorage)
// ============================================================================

export const saveResultImages = async (images) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    // Delete existing images
    await supabase
      .from('result_images')
      .delete()
      .eq('user_id', userId)

    // Insert new images
    const allImages = []
    Object.entries(images).forEach(([resultUrl, imageUrls]) => {
      imageUrls.forEach((imageUrl, index) => {
        allImages.push({
          user_id: userId,
          result_url: resultUrl,
          image_url: imageUrl,
          display_order: index
        })
      })
    })

    if (allImages.length > 0) {
      const { error } = await supabase
        .from('result_images')
        .insert(allImages)

      if (error) {
        console.error('Error saving result images:', error)
        return false
      }
    }

    console.log(`✅ Saved ${allImages.length} result images to cloud`)
    return true
  } catch (error) {
    console.error('Error in saveResultImages:', error)
    return false
  }
}

export const loadResultImages = async () => {
  const userId = await getCurrentUserId()
  if (!userId) return {}

  try {
    const { data, error } = await supabase
      .from('result_images')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error loading result images:', error)
      return {}
    }

    // Group by result_url
    const images = {}
    data.forEach(image => {
      if (!images[image.result_url]) {
        images[image.result_url] = []
      }
      images[image.result_url].push(image.image_url)
    })

    const totalImages = Object.values(images).reduce((sum, arr) => sum + arr.length, 0)
    console.log(`📖 Loaded ${totalImages} result images from cloud`)
    return images
  } catch (error) {
    console.error('Error in loadResultImages:', error)
    return {}
  }
}

// ============================================================================
// USER SETTINGS (replaces various settings localStorage keys)
// ============================================================================

export const saveSetting = async (key, value) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        setting_key: key,
        setting_value: value
      })

    if (error) {
      console.error(`Error saving setting ${key}:`, error)
      return false
    }

    console.log(`✅ Saved setting ${key} to cloud`)
    return true
  } catch (error) {
    console.error(`Error in saveSetting for ${key}:`, error)
    return false
  }
}

export const loadSetting = async (key, defaultValue = null) => {
  const userId = await getCurrentUserId()
  if (!userId) return defaultValue

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('user_id', userId)
      .eq('setting_key', key)
      .single()

    if (error && error.code === 'PGRST116') {
      // Setting doesn't exist
      return defaultValue
    } else if (error) {
      console.error(`Error loading setting ${key}:`, error)
      return defaultValue
    }

    console.log(`📖 Loaded setting ${key} from cloud`)
    return data.setting_value
  } catch (error) {
    console.error(`Error in loadSetting for ${key}:`, error)
    return defaultValue
  }
}

// ============================================================================
// DELETED BUILTIN PAGES (replaces deleted_builtin_pages localStorage)
// ============================================================================

export const saveDeletedBuiltinPages = async (deletedPages) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    // Delete existing entries
    await supabase
      .from('deleted_builtin_pages')
      .delete()
      .eq('user_id', userId)

    // Insert new entries
    if (deletedPages.length > 0) {
      const pageData = deletedPages.map(pageKey => ({
        user_id: userId,
        page_key: pageKey
      }))

      const { error } = await supabase
        .from('deleted_builtin_pages')
        .insert(pageData)

      if (error) {
        console.error('Error saving deleted builtin pages:', error)
        return false
      }
    }

    console.log(`✅ Saved ${deletedPages.length} deleted builtin pages to cloud`)
    return true
  } catch (error) {
    console.error('Error in saveDeletedBuiltinPages:', error)
    return false
  }
}

export const loadDeletedBuiltinPages = async () => {
  const userId = await getCurrentUserId()
  if (!userId) return []

  try {
    const { data, error } = await supabase
      .from('deleted_builtin_pages')
      .select('page_key')
      .eq('user_id', userId)

    if (error) {
      console.error('Error loading deleted builtin pages:', error)
      return []
    }

    const deletedPages = data.map(item => item.page_key)
    console.log(`📖 Loaded ${deletedPages.length} deleted builtin pages from cloud`)
    return deletedPages
  } catch (error) {
    console.error('Error in loadDeletedBuiltinPages:', error)
    return []
  }
}

// ============================================================================
// CLICK LOGS (replaces click_logs localStorage)
// ============================================================================

export const saveClickLog = async (searchQuery, resultUrl, resultTitle) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('click_logs')
      .insert({
        user_id: userId,
        search_query: searchQuery,
        result_url: resultUrl,
        result_title: resultTitle
      })

    if (error) {
      console.error('Error saving click log:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in saveClickLog:', error)
    return false
  }
}

export const loadClickLogs = async () => {
  const userId = await getCurrentUserId()
  if (!userId) return {}

  try {
    const { data, error } = await supabase
      .from('click_logs')
      .select('*')
      .eq('user_id', userId)
      .order('clicked_at', { ascending: false })

    if (error) {
      console.error('Error loading click logs:', error)
      return {}
    }

    // Group by search query
    const logs = {}
    data.forEach(log => {
      if (!logs[log.search_query]) {
        logs[log.search_query] = []
      }
      logs[log.search_query].push({
        url: log.result_url,
        title: log.result_title,
        timestamp: log.clicked_at
      })
    })

    const totalLogs = Object.values(logs).reduce((sum, arr) => sum + arr.length, 0)
    console.log(`📖 Loaded ${totalLogs} click logs from cloud`)
    return logs
  } catch (error) {
    console.error('Error in loadClickLogs:', error)
    return {}
  }
}

// ============================================================================
// INDIVIDUAL SAVE OPERATIONS (for real-time updates)
// ============================================================================

// Save a single AI overview (for when he edits one overview)
export const saveIndividualAIOverview = async (overview) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('ai_overviews')
      .upsert({
        id: overview.id,
        user_id: userId,
        title: overview.title,
        content: overview.content
      }, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })

    if (error) {
      console.error('Error saving individual AI overview:', error)
      return false
    }

    console.log(`✅ Updated AI overview "${overview.title}" in cloud`)
    return true
  } catch (error) {
    console.error('Error in saveIndividualAIOverview:', error)
    return false
  }
}

// Save a single custom search page (for when he creates/edits a page)
export const saveIndividualCustomPage = async (queryKey, pageData) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('custom_search_pages')
      .upsert({
        user_id: userId,
        query_key: queryKey,
        search_key: pageData.key,
        query: pageData.query,
        display_name: pageData.displayName
      }, { 
        onConflict: 'user_id,query_key',
        ignoreDuplicates: false 
      })

    if (error) {
      console.error('Error saving individual custom page:', error)
      return false
    }

    console.log(`✅ Updated custom page "${pageData.query}" in cloud`)
    return true
  } catch (error) {
    console.error('Error in saveIndividualCustomPage:', error)
    return false
  }
}

// Save results for a single search type (for when he edits one search's results)
export const saveIndividualSearchResults = async (searchType, searchResults) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    // Delete existing results for this search type only
    await supabase
      .from('custom_search_results')
      .delete()
      .eq('user_id', userId)
      .eq('search_type', searchType)

    // Insert new results for this search type
    if (searchResults.length > 0) {
      const resultData = searchResults.map((result, index) => ({
        user_id: userId,
        search_type: searchType,
        title: result.title,
        url: result.url,
        snippet: result.snippet || '',
        favicon: result.favicon || '',
        display_order: index
      }))

      const { error } = await supabase
        .from('custom_search_results')
        .insert(resultData)

      if (error) {
        console.error('Error saving individual search results:', error)
        return false
      }
    }

    console.log(`✅ Updated ${searchResults.length} results for "${searchType}" in cloud`)
    return true
  } catch (error) {
    console.error('Error in saveIndividualSearchResults:', error)
    return false
  }
}

// Delete a single AI overview (for when he deletes an overview)
export const deleteIndividualAIOverview = async (overviewId) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('ai_overviews')
      .delete()
      .eq('id', overviewId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting individual AI overview:', error)
      return false
    }

    console.log(`✅ Deleted AI overview ${overviewId} from cloud`)
    return true
  } catch (error) {
    console.error('Error in deleteIndividualAIOverview:', error)
    return false
  }
}

// ============================================================================
// MIGRATION FROM LOCALSTORAGE
// ============================================================================

export const migrateFromLocalStorage = async () => {
  console.log(`🔄 Starting migration from localStorage`)
  
  try {
    // Import userData functions to read from localStorage
    const { getUserData } = await import('./userData')
    
    // Collect all localStorage data
    const localData = {
      customSearchPages: getUserData('custom_search_pages', {}),
      deletedBuiltinPages: getUserData('deleted_builtin_pages', []),
      aiOverviews: getUserData('ai_overviews', []),
      searchResultAssignments: getUserData('search_result_assignments', {}),
      customSearchResults: getUserData('custom_search_results', {}),
      currentAIText: getUserData('ai_overview_text', ''),
      aiOverviewEnabled: getUserData('ai_overview_enabled', true),
      pageAIOverviewSettings: getUserData('page_ai_overview_settings', {}),
    }
    
    // Load result images from global localStorage
    try {
      const savedImages = localStorage.getItem('result_images')
      localData.resultImages = savedImages ? JSON.parse(savedImages) : {}
    } catch (error) {
      localData.resultImages = {}
    }
    
    // Check if there's any data to migrate
    const hasData = Object.keys(localData.customSearchPages).length > 0 ||
                   localData.deletedBuiltinPages.length > 0 ||
                   localData.aiOverviews.length > 0 ||
                   Object.keys(localData.customSearchResults).length > 0 ||
                   localData.currentAIText.length > 0 ||
                   Object.keys(localData.resultImages).length > 0
    
    if (!hasData) {
      console.log('📭 No localStorage data to migrate')
      return true
    }
    
    console.log('📦 Migrating localStorage data:', {
      customPages: Object.keys(localData.customSearchPages).length,
      aiOverviews: localData.aiOverviews.length,
      customResults: Object.keys(localData.customSearchResults).length,
      images: Object.keys(localData.resultImages).length
    })
    
    // Save all data to Supabase
    const success = await saveAllUserData(localData)
    
    if (success) {
      console.log('✅ Migration completed successfully')
      // Optionally clear localStorage after successful migration
      // We'll keep it for now as backup
    } else {
      console.warn('⚠️ Migration partially failed')
    }
    
    return success
  } catch (error) {
    console.error('❌ Migration failed:', error)
    return false
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

// Load ALL user data at once (replaces all individual localStorage.getItem calls)
export const loadAllUserData = async () => {
  console.log(`🔄 Loading all data for user`)
  
  const [
    customSearchPages,
    aiOverviews,
    currentAIText,
    searchResultAssignments,
    customSearchResults,
    resultImages,
    deletedBuiltinPages,
    aiOverviewEnabled,
    pageAIOverviewSettings,
    clickLogs
  ] = await Promise.all([
    loadCustomSearchPages(),
    loadAIOverviews(),
    loadCurrentAIText(),
    loadSearchResultAssignments(),
    loadCustomSearchResults(),
    loadResultImages(),
    loadDeletedBuiltinPages(),
    loadSetting('ai_overview_enabled', true),
    loadSetting('page_ai_overview_settings', {}),
    loadClickLogs()
  ])

  console.log(`✅ Loaded all data for user`)
  
  return {
    customSearchPages,
    aiOverviews,
    currentAIText,
    searchResultAssignments,
    customSearchResults,
    resultImages,
    deletedBuiltinPages,
    aiOverviewEnabled,
    pageAIOverviewSettings,
    clickLogs
  }
}

// Save ALL user data at once (replaces all individual localStorage.setItem calls)
export const saveAllUserData = async (data) => {
  console.log(`🔄 Saving all data for user`)
  
  const results = await Promise.all([
    saveCustomSearchPages(data.customSearchPages || {}),
    saveAIOverviews(data.aiOverviews || []),
    saveCurrentAIText(data.currentAIText || ''),
    saveSearchResultAssignments(data.searchResultAssignments || {}),
    saveCustomSearchResults(data.customSearchResults || {}),
    saveResultImages(data.resultImages || {}),
    saveDeletedBuiltinPages(data.deletedBuiltinPages || []),
    saveSetting('ai_overview_enabled', data.aiOverviewEnabled !== undefined ? data.aiOverviewEnabled : true),
    saveSetting('page_ai_overview_settings', data.pageAIOverviewSettings || {})
  ])

  const allSuccessful = results.every(result => result === true)
  
  if (allSuccessful) {
    console.log(`✅ Successfully saved all data for user`)
  } else {
    console.warn(`⚠️ Some data failed to save for user`)
  }
  
  return allSuccessful
}
