// Cloud Data Layer V2 - Relational structure with Realtime sync
// 
// Data Model:
// - users (user_profiles)
//   └── search_pages (custom_search_pages) - id, user_id, query, display_name
//         └── search_results (custom_search_results) - id, page_id, title, url, snippet
//   └── ai_overviews - id, user_id, title, content
//
// - ai_assignments - page_id, ai_overview_id (links pages to AI overviews)

import { supabase, getCurrentUser } from './supabase'

// ============================================================================
// USER MANAGEMENT
// ============================================================================

// Cache user ID to avoid repeated auth checks
let cachedUserId = null
let userIdPromise = null

export const getCurrentUserId = async () => {
  // Return cached value if available
  if (cachedUserId) return cachedUserId
  
  // If already fetching, wait for that promise
  if (userIdPromise) return userIdPromise
  
  userIdPromise = (async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        cachedUserId = null
        return null
      }
      
      // Skip ensureUserProfile for reads - it's only needed for writes
      // The profile will be created on first write if needed
      cachedUserId = user.id
      return user.id
    } catch (error) {
      console.error('Error getting current user ID:', error)
      cachedUserId = null
      return null
    } finally {
      userIdPromise = null
    }
  })()
  
  return userIdPromise
}

// Clear cache on logout
export const clearUserIdCache = () => {
  cachedUserId = null
  userIdPromise = null
}

// ============================================================================
// SEARCH PAGES (with proper UUID IDs)
// ============================================================================

export const createSearchPage = async (pageData) => {
  const userId = await getCurrentUserId()
  if (!userId) return null

  try {
    const { data, error } = await supabase
      .from('custom_search_pages')
      .insert({
        user_id: userId,
        query_key: pageData.queryKey,
        search_key: pageData.searchKey,
        query: pageData.query,
        display_name: pageData.displayName
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating search page:', error)
      return null
    }

    console.log(`✅ Created search page: ${data.display_name}`)
    return data
  } catch (error) {
    console.error('Error in createSearchPage:', error)
    return null
  }
}

export const updateSearchPage = async (pageId, updates) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('custom_search_pages')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating search page:', error)
      return false
    }

    console.log(`✅ Updated search page: ${pageId}`)
    return true
  } catch (error) {
    console.error('Error in updateSearchPage:', error)
    return false
  }
}

export const deleteSearchPage = async (pageId) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('custom_search_pages')
      .delete()
      .eq('id', pageId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting search page:', error)
      return false
    }

    console.log(`✅ Deleted search page: ${pageId}`)
    return true
  } catch (error) {
    console.error('Error in deleteSearchPage:', error)
    return false
  }
}

export const loadSearchPages = async (userId = null) => {
  const uid = userId || await getCurrentUserId()
  if (!uid) return []

  try {
    const { data, error } = await supabase
      .from('custom_search_pages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading search pages:', error)
      return []
    }

    return data
  } catch (error) {
    console.error('Error in loadSearchPages:', error)
    return []
  }
}

export const getSearchPageByQueryKey = async (queryKey) => {
  const userId = await getCurrentUserId()
  if (!userId) return null

  try {
    const { data, error } = await supabase
      .from('custom_search_pages')
      .select('*')
      .eq('user_id', userId)
      .eq('query_key', queryKey)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting search page:', error)
    }

    return data || null
  } catch (error) {
    console.error('Error in getSearchPageByQueryKey:', error)
    return null
  }
}

// ============================================================================
// SEARCH RESULTS (linked to pages via page_id)
// ============================================================================

export const createSearchResult = async (pageId, resultData) => {
  const userId = await getCurrentUserId()
  if (!userId) return null

  try {
    // Get the current max display_order for this page
    const { data: existingResults } = await supabase
      .from('custom_search_results')
      .select('display_order')
      .eq('page_id', pageId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existingResults?.length > 0 ? existingResults[0].display_order + 1 : 0

    const { data, error } = await supabase
      .from('custom_search_results')
      .insert({
        user_id: userId,
        page_id: pageId,
        search_type: resultData.searchType, // Keep for backward compatibility
        title: resultData.title,
        url: resultData.url,
        snippet: resultData.snippet || '',
        favicon: resultData.favicon || '',
        display_order: nextOrder
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating search result:', error)
      return null
    }

    console.log(`✅ Created search result: ${data.title}`)
    return data
  } catch (error) {
    console.error('Error in createSearchResult:', error)
    return null
  }
}

export const updateSearchResult = async (resultId, updates) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('custom_search_results')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', resultId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating search result:', error)
      return false
    }

    console.log(`✅ Updated search result: ${resultId}`)
    return true
  } catch (error) {
    console.error('Error in updateSearchResult:', error)
    return false
  }
}

export const deleteSearchResult = async (resultId) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('custom_search_results')
      .delete()
      .eq('id', resultId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting search result:', error)
      return false
    }

    console.log(`✅ Deleted search result: ${resultId}`)
    return true
  } catch (error) {
    console.error('Error in deleteSearchResult:', error)
    return false
  }
}

export const loadSearchResultsByPageId = async (pageId) => {
  const userId = await getCurrentUserId()
  if (!userId) return []

  try {
    const { data, error } = await supabase
      .from('custom_search_results')
      .select('*')
      .eq('page_id', pageId)
      .eq('user_id', userId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error loading search results:', error)
      return []
    }

    return data
  } catch (error) {
    console.error('Error in loadSearchResultsByPageId:', error)
    return []
  }
}

export const loadAllSearchResults = async (userId = null) => {
  const uid = userId || await getCurrentUserId()
  if (!uid) return {}

  try {
    const { data, error } = await supabase
      .from('custom_search_results')
      .select('*')
      .eq('user_id', uid)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error loading all search results:', error)
      return {}
    }

    // Group by page_id
    const resultsByPage = {}
    data.forEach(result => {
      if (!resultsByPage[result.page_id]) {
        resultsByPage[result.page_id] = []
      }
      resultsByPage[result.page_id].push(result)
    })

    return resultsByPage
  } catch (error) {
    console.error('Error in loadAllSearchResults:', error)
    return {}
  }
}

export const reorderSearchResults = async (pageId, resultIds) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    // Update each result with its new display_order
    const updates = resultIds.map((id, index) => 
      supabase
        .from('custom_search_results')
        .update({ display_order: index })
        .eq('id', id)
        .eq('user_id', userId)
    )

    await Promise.all(updates)
    console.log(`✅ Reordered ${resultIds.length} results for page ${pageId}`)
    return true
  } catch (error) {
    console.error('Error in reorderSearchResults:', error)
    return false
  }
}

// ============================================================================
// AI OVERVIEWS
// ============================================================================

export const createAIOverview = async (overviewData) => {
  const userId = await getCurrentUserId()
  if (!userId) return null

  try {
    const { data, error } = await supabase
      .from('ai_overviews')
      .insert({
        user_id: userId,
        title: overviewData.title,
        content: overviewData.content
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating AI overview:', error)
      return null
    }

    console.log(`✅ Created AI overview: ${data.title}`)
    return data
  } catch (error) {
    console.error('Error in createAIOverview:', error)
    return null
  }
}

export const updateAIOverview = async (overviewId, updates) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('ai_overviews')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', overviewId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating AI overview:', error)
      return false
    }

    console.log(`✅ Updated AI overview: ${overviewId}`)
    return true
  } catch (error) {
    console.error('Error in updateAIOverview:', error)
    return false
  }
}

export const deleteAIOverview = async (overviewId) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('ai_overviews')
      .delete()
      .eq('id', overviewId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting AI overview:', error)
      return false
    }

    console.log(`✅ Deleted AI overview: ${overviewId}`)
    return true
  } catch (error) {
    console.error('Error in deleteAIOverview:', error)
    return false
  }
}

export const loadAIOverviews = async (userId = null) => {
  const uid = userId || await getCurrentUserId()
  if (!uid) return []

  try {
    const { data, error } = await supabase
      .from('ai_overviews')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading AI overviews:', error)
      return []
    }

    return data
  } catch (error) {
    console.error('Error in loadAIOverviews:', error)
    return []
  }
}

// ============================================================================
// AI ASSIGNMENTS (links pages to AI overviews)
// ============================================================================

export const assignAIToPage = async (pageId, aiOverviewId, options = {}) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    // Upsert - insert or update if exists
    const { error } = await supabase
      .from('ai_assignments')
      .upsert({
        page_id: pageId,
        ai_overview_id: aiOverviewId,
        font_size: options.fontSize || 'medium',
        font_family: options.fontFamily || 'system',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'page_id'
      })

    if (error) {
      console.error('Error assigning AI to page:', error)
      return false
    }

    console.log(`✅ Assigned AI overview ${aiOverviewId} to page ${pageId}`)
    return true
  } catch (error) {
    console.error('Error in assignAIToPage:', error)
    return false
  }
}

export const removeAIFromPage = async (pageId) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('ai_assignments')
      .delete()
      .eq('page_id', pageId)

    if (error) {
      console.error('Error removing AI from page:', error)
      return false
    }

    console.log(`✅ Removed AI assignment from page ${pageId}`)
    return true
  } catch (error) {
    console.error('Error in removeAIFromPage:', error)
    return false
  }
}

export const loadAIAssignments = async (userId = null) => {
  const uid = userId || await getCurrentUserId()
  if (!uid) return {}

  try {
    // Join with custom_search_pages to filter by user
    const { data, error } = await supabase
      .from('ai_assignments')
      .select(`
        id,
        page_id,
        ai_overview_id,
        font_size,
        font_family,
        font_color,
        custom_search_pages!inner(user_id)
      `)
      .eq('custom_search_pages.user_id', uid)

    if (error) {
      console.error('Error loading AI assignments:', error)
      return {}
    }

    // Convert to map: pageId -> assignment object
    const assignments = {}
    data.forEach(assignment => {
      assignments[assignment.page_id] = {
        aiOverviewId: assignment.ai_overview_id,
        fontSize: assignment.font_size || '14',
        fontFamily: assignment.font_family || 'system',
        fontColor: assignment.font_color ?? ''
      }
    })

    return assignments
  } catch (error) {
    console.error('Error in loadAIAssignments:', error)
    return {}
  }
}

export const getAIAssignmentForPage = async (pageId) => {
  try {
    const { data, error } = await supabase
      .from('ai_assignments')
      .select('ai_overview_id, font_size, font_family')
      .eq('page_id', pageId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting AI assignment:', error)
    }

    if (!data) return null
    
    return {
      aiOverviewId: data.ai_overview_id,
      fontSize: data.font_size || 'medium',
      fontFamily: data.font_family || 'system'
    }
  } catch (error) {
    console.error('Error in getAIAssignmentForPage:', error)
    return null
  }
}

export const updateAIAssignmentSettings = async (pageId, settings) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const updateData = {
      updated_at: new Date().toISOString()
    }
    if (settings.fontSize !== undefined) updateData.font_size = settings.fontSize
    if (settings.fontFamily !== undefined) updateData.font_family = settings.fontFamily
    if (settings.fontColor !== undefined) updateData.font_color = settings.fontColor

    const { error } = await supabase
      .from('ai_assignments')
      .update(updateData)
      .eq('page_id', pageId)

    if (error) {
      console.error('Error updating AI assignment settings:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateAIAssignmentSettings:', error)
    return false
  }
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

let realtimeChannel = null

export const subscribeToRealtimeUpdates = (userId, callbacks) => {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe()
  }

  realtimeChannel = supabase
    .channel('user-data-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'custom_search_pages',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('🔄 Search pages changed:', payload.eventType)
        if (callbacks.onPagesChange) {
          callbacks.onPagesChange(payload)
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'custom_search_results',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('🔄 Search results changed:', payload.eventType)
        if (callbacks.onResultsChange) {
          callbacks.onResultsChange(payload)
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ai_overviews',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('🔄 AI overviews changed:', payload.eventType)
        if (callbacks.onAIOverviewsChange) {
          callbacks.onAIOverviewsChange(payload)
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ai_assignments'
      },
      (payload) => {
        console.log('🔄 AI assignments changed:', payload.eventType)
        if (callbacks.onAIAssignmentsChange) {
          callbacks.onAIAssignmentsChange(payload)
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 Realtime subscription status:', status)
    })

  return realtimeChannel
}

export const unsubscribeFromRealtimeUpdates = () => {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe()
    realtimeChannel = null
    console.log('📡 Unsubscribed from realtime updates')
  }
}

// ============================================================================
// BULK LOAD (for initial page load)
// ============================================================================

export const loadAllUserData = async () => {
  const userId = await getCurrentUserId()
  if (!userId) {
    return {
      pages: [],
      resultsByPage: {},
      aiOverviews: [],
      aiAssignments: {},
      participants: []
    }
  }

  // Pass userId to all functions to avoid redundant auth checks
  const [pages, resultsByPage, aiOverviews, aiAssignments, participants] = await Promise.all([
    loadSearchPages(userId),
    loadAllSearchResults(userId),
    loadAIOverviews(userId),
    loadAIAssignments(userId),
    loadParticipants(userId)
  ])

  return {
    pages,
    resultsByPage,
    aiOverviews,
    aiAssignments,
    participants
  }
}

// ============================================================================
// HELPER: Convert old format to new format
// ============================================================================

export const getPageIdBySearchKey = async (searchKey) => {
  const userId = await getCurrentUserId()
  if (!userId) return null

  try {
    const { data, error } = await supabase
      .from('custom_search_pages')
      .select('id')
      .eq('user_id', userId)
      .eq('search_key', searchKey)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting page by search key:', error)
    }

    return data?.id || null
  } catch (error) {
    console.error('Error in getPageIdBySearchKey:', error)
    return null
  }
}

// ============================================================================
// PARTICIPANTS
// ============================================================================

export const createParticipant = async (name) => {
  const userId = await getCurrentUserId()
  if (!userId) return null

  try {
    const { data, error } = await supabase
      .from('participants')
      .insert({
        user_id: userId,
        name: name.trim()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating participant:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in createParticipant:', error)
    return null
  }
}

export const updateParticipant = async (participantId, updates) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('participants')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', participantId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating participant:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateParticipant:', error)
    return false
  }
}

export const deleteParticipant = async (participantId) => {
  const userId = await getCurrentUserId()
  if (!userId) return false

  try {
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', participantId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting participant:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteParticipant:', error)
    return false
  }
}

export const loadParticipants = async (userId = null) => {
  const uid = userId || await getCurrentUserId()
  if (!uid) return []

  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading participants:', error)
      return []
    }

    return data
  } catch (error) {
    console.error('Error in loadParticipants:', error)
    return []
  }
}

// ============================================================================
// SESSION ACTIVITY (defined before SESSIONS to avoid circular dependency)
// ============================================================================

export const addSessionActivity = async (sessionId, activityType, details = null, pageName = null, pageId = null, sessionStartTime = null) => {
  try {
    const now = new Date()
    const timeSinceStartMs = sessionStartTime ? now.getTime() - new Date(sessionStartTime).getTime() : null
    
    const { data, error } = await supabase
      .from('session_activity')
      .insert({
        session_id: sessionId,
        activity_type: activityType,
        activity_ts: now.toISOString(),
        details: details,
        page_name: pageName,
        page_id: pageId,
        time_since_start_ms: timeSinceStartMs
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding session activity:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in addSessionActivity:', error)
    return null
  }
}

export const loadSessionActivity = async (sessionId) => {
  try {
    const { data, error } = await supabase
      .from('session_activity')
      .select('*')
      .eq('session_id', sessionId)
      .order('activity_ts', { ascending: true })

    if (error) {
      console.error('Error loading session activity:', error)
      return []
    }

    return data
  } catch (error) {
    console.error('Error in loadSessionActivity:', error)
    return []
  }
}

// ============================================================================
// SESSIONS
// ============================================================================

export const createSession = async (participantId) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        participant_id: participantId,
        status: 'active',
        session_start: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      return null
    }

    // Log SESSION_START activity
    if (data) {
      await addSessionActivity(data.id, 'SESSION_START', {
        participant_id: participantId
      })
    }

    return data
  } catch (error) {
    console.error('Error in createSession:', error)
    return null
  }
}

export const endSession = async (sessionId) => {
  try {
    // Log SESSION_END activity before ending
    await addSessionActivity(sessionId, 'SESSION_END', {})

    const { data, error } = await supabase
      .from('sessions')
      .update({
        status: 'idle',
        session_end: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('Error ending session:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in endSession:', error)
    return null
  }
}

export const getActiveSession = async (participantId) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('participant_id', participantId)
      .eq('status', 'active')
      .order('session_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error getting active session:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getActiveSession:', error)
    return null
  }
}

// Get any active session across all participants (only one allowed at a time)
export const getAnyActiveSession = async (userId = null) => {
  const uid = userId || await getCurrentUserId()
  if (!uid) return null

  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*, participants!inner(user_id, name)')
      .eq('participants.user_id', uid)
      .eq('status', 'active')
      .order('session_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error getting any active session:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getAnyActiveSession:', error)
    return null
  }
}

export const loadSessionsForParticipant = async (participantId) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('participant_id', participantId)
      .order('session_start', { ascending: false })

    if (error) {
      console.error('Error loading sessions:', error)
      return []
    }

    return data
  } catch (error) {
    console.error('Error in loadSessionsForParticipant:', error)
    return []
  }
}

export const deleteSession = async (sessionId) => {
  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      console.error('Error deleting session:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteSession:', error)
    return false
  }
}

