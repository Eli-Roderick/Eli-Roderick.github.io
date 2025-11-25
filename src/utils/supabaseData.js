import { supabase, getCurrentUser, ensureUserProfile } from './supabase'

// Custom Search Pages
export const getCustomSearchPages = async () => {
  const user = await getCurrentUser()
  if (!user) return {}

  const { data, error } = await supabase
    .from('custom_search_pages')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching custom search pages:', error)
    return {}
  }

  // Convert to the expected format: { queryKey: pageData }
  const pages = {}
  data.forEach(page => {
    pages[page.query_key] = {
      key: page.search_key,
      query: page.query,
      displayName: page.display_name
    }
  })

  return pages
}

export const saveCustomSearchPages = async (pages) => {
  const user = await getCurrentUser()
  if (!user) return false

  await ensureUserProfile(user)

  // Delete existing pages for this user
  await supabase
    .from('custom_search_pages')
    .delete()
    .eq('user_id', user.id)

  // Insert new pages
  const pageData = Object.entries(pages).map(([queryKey, page]) => ({
    user_id: user.id,
    query_key: queryKey,
    search_key: page.key,
    query: page.query,
    display_name: page.displayName
  }))

  if (pageData.length > 0) {
    const { error } = await supabase
      .from('custom_search_pages')
      .insert(pageData)

    if (error) {
      console.error('Error saving custom search pages:', error)
      return false
    }
  }

  return true
}

// AI Overviews
export const getAIOverviews = async () => {
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('ai_overviews')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching AI overviews:', error)
    return []
  }

  return data.map(overview => ({
    id: overview.id,
    title: overview.title,
    content: overview.content,
    createdAt: overview.created_at
  }))
}

export const saveAIOverview = async (overview) => {
  const user = await getCurrentUser()
  if (!user) return null

  await ensureUserProfile(user)

  const { data, error } = await supabase
    .from('ai_overviews')
    .insert({
      user_id: user.id,
      title: overview.title,
      content: overview.content
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving AI overview:', error)
    return null
  }

  return {
    id: data.id,
    title: data.title,
    content: data.content,
    createdAt: data.created_at
  }
}

export const updateAIOverview = async (id, updates) => {
  const user = await getCurrentUser()
  if (!user) return false

  const { error } = await supabase
    .from('ai_overviews')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error updating AI overview:', error)
    return false
  }

  return true
}

export const deleteAIOverview = async (id) => {
  const user = await getCurrentUser()
  if (!user) return false

  const { error } = await supabase
    .from('ai_overviews')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting AI overview:', error)
    return false
  }

  return true
}

// Search Result Assignments
export const getSearchResultAssignments = async () => {
  const user = await getCurrentUser()
  if (!user) return {}

  const { data, error } = await supabase
    .from('search_result_assignments')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching search result assignments:', error)
    return {}
  }

  // Convert to expected format: { searchType: aiOverviewId }
  const assignments = {}
  data.forEach(assignment => {
    assignments[assignment.search_type] = assignment.ai_overview_id
  })

  return assignments
}

export const saveSearchResultAssignment = async (searchType, aiOverviewId) => {
  const user = await getCurrentUser()
  if (!user) return false

  await ensureUserProfile(user)

  const { error } = await supabase
    .from('search_result_assignments')
    .upsert({
      user_id: user.id,
      search_type: searchType,
      ai_overview_id: aiOverviewId
    })

  if (error) {
    console.error('Error saving search result assignment:', error)
    return false
  }

  return true
}

export const removeSearchResultAssignment = async (searchType) => {
  const user = await getCurrentUser()
  if (!user) return false

  const { error } = await supabase
    .from('search_result_assignments')
    .delete()
    .eq('user_id', user.id)
    .eq('search_type', searchType)

  if (error) {
    console.error('Error removing search result assignment:', error)
    return false
  }

  return true
}

// Custom Search Results
export const getCustomSearchResults = async () => {
  const user = await getCurrentUser()
  if (!user) return {}

  const { data, error } = await supabase
    .from('custom_search_results')
    .select('*')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching custom search results:', error)
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

  return results
}

export const saveCustomSearchResults = async (searchType, results) => {
  const user = await getCurrentUser()
  if (!user) return false

  await ensureUserProfile(user)

  // Delete existing results for this search type
  await supabase
    .from('custom_search_results')
    .delete()
    .eq('user_id', user.id)
    .eq('search_type', searchType)

  // Insert new results
  if (results.length > 0) {
    const resultData = results.map((result, index) => ({
      user_id: user.id,
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
      console.error('Error saving custom search results:', error)
      return false
    }
  }

  return true
}

// Result Images
export const getResultImages = async () => {
  const user = await getCurrentUser()
  if (!user) return {}

  const { data, error } = await supabase
    .from('result_images')
    .select('*')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching result images:', error)
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

  return images
}

export const saveResultImages = async (resultUrl, imageUrls) => {
  const user = await getCurrentUser()
  if (!user) return false

  await ensureUserProfile(user)

  // Delete existing images for this result URL
  await supabase
    .from('result_images')
    .delete()
    .eq('user_id', user.id)
    .eq('result_url', resultUrl)

  // Insert new images
  if (imageUrls.length > 0) {
    const imageData = imageUrls.map((imageUrl, index) => ({
      user_id: user.id,
      result_url: resultUrl,
      image_url: imageUrl,
      display_order: index
    }))

    const { error } = await supabase
      .from('result_images')
      .insert(imageData)

    if (error) {
      console.error('Error saving result images:', error)
      return false
    }
  }

  return true
}

// User Settings
export const getUserSetting = async (key, defaultValue = null) => {
  const user = await getCurrentUser()
  if (!user) return defaultValue

  const { data, error } = await supabase
    .from('user_settings')
    .select('setting_value')
    .eq('user_id', user.id)
    .eq('setting_key', key)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Setting doesn't exist, return default
      return defaultValue
    }
    console.error('Error fetching user setting:', error)
    return defaultValue
  }

  return data.setting_value
}

export const setUserSetting = async (key, value) => {
  const user = await getCurrentUser()
  if (!user) return false

  await ensureUserProfile(user)

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      setting_key: key,
      setting_value: value
    })

  if (error) {
    console.error('Error saving user setting:', error)
    return false
  }

  return true
}

// Deleted Built-in Pages
export const getDeletedBuiltinPages = async () => {
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('deleted_builtin_pages')
    .select('page_key')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching deleted builtin pages:', error)
    return []
  }

  return data.map(item => item.page_key)
}

export const addDeletedBuiltinPage = async (pageKey) => {
  const user = await getCurrentUser()
  if (!user) return false

  await ensureUserProfile(user)

  const { error } = await supabase
    .from('deleted_builtin_pages')
    .insert({
      user_id: user.id,
      page_key: pageKey
    })

  if (error) {
    console.error('Error adding deleted builtin page:', error)
    return false
  }

  return true
}

// Click Logs
export const saveClickLog = async (searchQuery, resultUrl, resultTitle) => {
  const user = await getCurrentUser()
  if (!user) return false

  await ensureUserProfile(user)

  const { error } = await supabase
    .from('click_logs')
    .insert({
      user_id: user.id,
      search_query: searchQuery,
      result_url: resultUrl,
      result_title: resultTitle
    })

  if (error) {
    console.error('Error saving click log:', error)
    return false
  }

  return true
}

export const getClickLogs = async () => {
  const user = await getCurrentUser()
  if (!user) return {}

  const { data, error } = await supabase
    .from('click_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('clicked_at', { ascending: false })

  if (error) {
    console.error('Error fetching click logs:', error)
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

  return logs
}
