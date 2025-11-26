// Complete Cloud Data Layer - Replaces ALL localStorage operations
// Every function here corresponds to a localStorage operation in the original code

import { supabase } from './supabase'

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const ensureUserExists = async (username) => {
  try {
    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (checkError && checkError.code === 'PGRST116') {
      // User doesn't exist, create them
      const { data: newUser, error: createError } = await supabase
        .from('user_profiles')
        .insert({ username })
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        return null
      }
      return newUser.id
    } else if (checkError) {
      console.error('Error checking user:', checkError)
      return null
    }

    return existingUser.id
  } catch (error) {
    console.error('Error in ensureUserExists:', error)
    return null
  }
}

// ============================================================================
// CUSTOM SEARCH PAGES (replaces custom_search_pages localStorage)
// ============================================================================

export const saveCustomSearchPages = async (username, pages) => {
  const userId = await ensureUserExists(username)
  if (!userId) return false

  try {
    // Delete existing pages
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

export const loadCustomSearchPages = async (username) => {
  const userId = await ensureUserExists(username)
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

export const saveAIOverviews = async (username, overviews) => {
  const userId = await ensureUserExists(username)
  if (!userId) return false

  try {
    // Use upsert to update existing or insert new overviews
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

export const loadAIOverviews = async (username) => {
  const userId = await ensureUserExists(username)
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

export const saveCurrentAIText = async (username, content) => {
  const userId = await ensureUserExists(username)
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('current_ai_text')
      .upsert({
        user_id: userId,
        content: content
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

export const loadCurrentAIText = async (username) => {
  const userId = await ensureUserExists(username)
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

export const saveSearchResultAssignments = async (username, assignments) => {
  const userId = await ensureUserExists(username)
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

export const loadSearchResultAssignments = async (username) => {
  const userId = await ensureUserExists(username)
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

export const saveCustomSearchResults = async (username, results) => {
  const userId = await ensureUserExists(username)
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

export const loadCustomSearchResults = async (username) => {
  const userId = await ensureUserExists(username)
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

export const saveResultImages = async (username, images) => {
  const userId = await ensureUserExists(username)
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

export const loadResultImages = async (username) => {
  const userId = await ensureUserExists(username)
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

export const saveSetting = async (username, key, value) => {
  const userId = await ensureUserExists(username)
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

export const loadSetting = async (username, key, defaultValue = null) => {
  const userId = await ensureUserExists(username)
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

export const saveDeletedBuiltinPages = async (username, deletedPages) => {
  const userId = await ensureUserExists(username)
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

export const loadDeletedBuiltinPages = async (username) => {
  const userId = await ensureUserExists(username)
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

export const saveClickLog = async (username, searchQuery, resultUrl, resultTitle) => {
  const userId = await ensureUserExists(username)
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

export const loadClickLogs = async (username) => {
  const userId = await ensureUserExists(username)
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
export const saveIndividualAIOverview = async (username, overview) => {
  const userId = await ensureUserExists(username)
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
export const saveIndividualCustomPage = async (username, queryKey, pageData) => {
  const userId = await ensureUserExists(username)
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
export const saveIndividualSearchResults = async (username, searchType, searchResults) => {
  const userId = await ensureUserExists(username)
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
export const deleteIndividualAIOverview = async (username, overviewId) => {
  const userId = await ensureUserExists(username)
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
// BULK OPERATIONS
// ============================================================================

// Load ALL user data at once (replaces all individual localStorage.getItem calls)
export const loadAllUserData = async (username) => {
  console.log(`🔄 Loading all data for user: ${username}`)
  
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
    loadCustomSearchPages(username),
    loadAIOverviews(username),
    loadCurrentAIText(username),
    loadSearchResultAssignments(username),
    loadCustomSearchResults(username),
    loadResultImages(username),
    loadDeletedBuiltinPages(username),
    loadSetting(username, 'ai_overview_enabled', true),
    loadSetting(username, 'page_ai_overview_settings', {}),
    loadClickLogs(username)
  ])

  console.log(`✅ Loaded all data for user: ${username}`)
  
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
export const saveAllUserData = async (username, data) => {
  console.log(`🔄 Saving all data for user: ${username}`)
  
  const results = await Promise.all([
    saveCustomSearchPages(username, data.customSearchPages || {}),
    saveAIOverviews(username, data.aiOverviews || []),
    saveCurrentAIText(username, data.currentAIText || ''),
    saveSearchResultAssignments(username, data.searchResultAssignments || {}),
    saveCustomSearchResults(username, data.customSearchResults || {}),
    saveResultImages(username, data.resultImages || {}),
    saveDeletedBuiltinPages(username, data.deletedBuiltinPages || []),
    saveSetting(username, 'ai_overview_enabled', data.aiOverviewEnabled !== undefined ? data.aiOverviewEnabled : true),
    saveSetting(username, 'page_ai_overview_settings', data.pageAIOverviewSettings || {})
  ])

  const allSuccessful = results.every(result => result === true)
  
  if (allSuccessful) {
    console.log(`✅ Successfully saved all data for user: ${username}`)
  } else {
    console.warn(`⚠️ Some data failed to save for user: ${username}`)
  }
  
  return allSuccessful
}
