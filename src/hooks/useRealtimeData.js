// React hook for realtime data synchronization
// Provides live-updating data from Supabase with automatic subscriptions

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  loadAllUserData,
  loadSearchPages,
  loadAllSearchResults,
  loadAIOverviews,
  loadAIAssignments,
  loadParticipants,
  createSearchPage,
  updateSearchPage,
  deleteSearchPage,
  createSearchResult,
  updateSearchResult,
  deleteSearchResult,
  reorderSearchResults,
  createAIOverview,
  updateAIOverview,
  deleteAIOverview,
  assignAIToPage,
  removeAIFromPage,
  createParticipant,
  updateParticipant,
  deleteParticipant,
  subscribeToRealtimeUpdates,
  unsubscribeFromRealtimeUpdates,
  getCurrentUserId
} from '../utils/cloudDataV2'

export function useRealtimeData(currentUser) {
  // Data state
  const [pages, setPages] = useState([])
  const [resultsByPage, setResultsByPage] = useState({})
  const [aiOverviews, setAIOverviews] = useState([])
  const [aiAssignments, setAIAssignments] = useState({})
  const [participants, setParticipants] = useState([])
  
  // Loading state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Track if we're connected to realtime
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  
  // Ref to track current user ID for subscriptions
  const userIdRef = useRef(null)

  // Initial data load - wait for Supabase auth to be ready
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) {
        setPages([])
        setResultsByPage({})
        setAIOverviews([])
        setAIAssignments({})
        setParticipants([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await loadAllUserData()
        setPages(data.pages)
        setResultsByPage(data.resultsByPage)
        setAIOverviews(data.aiOverviews)
        setAIAssignments(data.aiAssignments)
        setParticipants(data.participants)
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentUser])

  // Setup realtime subscriptions
  useEffect(() => {
    const setupRealtime = async () => {
      if (!currentUser) {
        unsubscribeFromRealtimeUpdates()
        setRealtimeConnected(false)
        return
      }

      const userId = await getCurrentUserId()
      if (!userId) return

      userIdRef.current = userId

      subscribeToRealtimeUpdates(userId, {
        onPagesChange: async (payload) => {
          console.log('📡 Pages update received:', payload.eventType)
          // Reload pages on any change
          const updatedPages = await loadSearchPages()
          setPages(updatedPages)
        },
        onResultsChange: async (payload) => {
          console.log('📡 Results update received:', payload.eventType)
          // Reload all results on any change
          const updatedResults = await loadAllSearchResults()
          setResultsByPage(updatedResults)
        },
        onAIOverviewsChange: async (payload) => {
          console.log('📡 AI Overviews update received:', payload.eventType)
          const updatedOverviews = await loadAIOverviews()
          setAIOverviews(updatedOverviews)
        },
        onAIAssignmentsChange: async (payload) => {
          console.log('📡 AI Assignments update received:', payload.eventType)
          const updatedAssignments = await loadAIAssignments()
          setAIAssignments(updatedAssignments)
        }
      })

      setRealtimeConnected(true)
    }

    setupRealtime()

    return () => {
      unsubscribeFromRealtimeUpdates()
      setRealtimeConnected(false)
    }
  }, [currentUser])

  // ============================================================================
  // PAGE OPERATIONS
  // ============================================================================

  const addPage = useCallback(async (pageData) => {
    const newPage = await createSearchPage(pageData)
    if (newPage) {
      // Optimistic update - realtime will confirm
      setPages(prev => [...prev, newPage])
    }
    return newPage
  }, [])

  const editPage = useCallback(async (pageId, updates) => {
    const success = await updateSearchPage(pageId, updates)
    if (success) {
      // Optimistic update
      setPages(prev => prev.map(p => 
        p.id === pageId ? { ...p, ...updates } : p
      ))
    }
    return success
  }, [])

  const removePage = useCallback(async (pageId) => {
    const success = await deleteSearchPage(pageId)
    if (success) {
      // Optimistic update
      setPages(prev => prev.filter(p => p.id !== pageId))
      setResultsByPage(prev => {
        const updated = { ...prev }
        delete updated[pageId]
        return updated
      })
      setAIAssignments(prev => {
        const updated = { ...prev }
        delete updated[pageId]
        return updated
      })
    }
    return success
  }, [])

  // ============================================================================
  // RESULT OPERATIONS
  // ============================================================================

  const addResult = useCallback(async (pageId, resultData) => {
    const newResult = await createSearchResult(pageId, resultData)
    if (newResult) {
      // Optimistic update
      setResultsByPage(prev => ({
        ...prev,
        [pageId]: [...(prev[pageId] || []), newResult]
      }))
    }
    return newResult
  }, [])

  const editResult = useCallback(async (resultId, pageId, updates) => {
    const success = await updateSearchResult(resultId, updates)
    if (success) {
      // Optimistic update
      setResultsByPage(prev => ({
        ...prev,
        [pageId]: (prev[pageId] || []).map(r =>
          r.id === resultId ? { ...r, ...updates } : r
        )
      }))
    }
    return success
  }, [])

  const removeResult = useCallback(async (resultId, pageId) => {
    const success = await deleteSearchResult(resultId)
    if (success) {
      // Optimistic update
      setResultsByPage(prev => ({
        ...prev,
        [pageId]: (prev[pageId] || []).filter(r => r.id !== resultId)
      }))
    }
    return success
  }, [])

  const reorderResults = useCallback(async (pageId, resultIds) => {
    const success = await reorderSearchResults(pageId, resultIds)
    if (success) {
      // Optimistic update - reorder based on resultIds array
      setResultsByPage(prev => {
        const currentResults = prev[pageId] || []
        const reordered = resultIds.map(id => 
          currentResults.find(r => r.id === id)
        ).filter(Boolean)
        return {
          ...prev,
          [pageId]: reordered
        }
      })
    }
    return success
  }, [])

  // ============================================================================
  // AI OVERVIEW OPERATIONS
  // ============================================================================

  const addAIOverview = useCallback(async (overviewData) => {
    const newOverview = await createAIOverview(overviewData)
    if (newOverview) {
      // Optimistic update
      setAIOverviews(prev => [newOverview, ...prev])
    }
    return newOverview
  }, [])

  const editAIOverview = useCallback(async (overviewId, updates) => {
    const success = await updateAIOverview(overviewId, updates)
    if (success) {
      // Optimistic update
      setAIOverviews(prev => prev.map(o =>
        o.id === overviewId ? { ...o, ...updates } : o
      ))
    }
    return success
  }, [])

  const removeAIOverview = useCallback(async (overviewId) => {
    const success = await deleteAIOverview(overviewId)
    if (success) {
      // Optimistic update
      setAIOverviews(prev => prev.filter(o => o.id !== overviewId))
      // Also remove any assignments using this overview
      setAIAssignments(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(pageId => {
          if (updated[pageId] === overviewId) {
            delete updated[pageId]
          }
        })
        return updated
      })
    }
    return success
  }, [])

  // ============================================================================
  // AI ASSIGNMENT OPERATIONS
  // ============================================================================

  const assignAI = useCallback(async (pageId, aiOverviewId) => {
    const success = await assignAIToPage(pageId, aiOverviewId)
    if (success) {
      // Optimistic update
      setAIAssignments(prev => ({
        ...prev,
        [pageId]: aiOverviewId
      }))
    }
    return success
  }, [])

  const unassignAI = useCallback(async (pageId) => {
    const success = await removeAIFromPage(pageId)
    if (success) {
      // Optimistic update
      setAIAssignments(prev => {
        const updated = { ...prev }
        delete updated[pageId]
        return updated
      })
    }
    return success
  }, [])

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getPageById = useCallback((pageId) => {
    return pages.find(p => p.id === pageId) || null
  }, [pages])

  const getPageByQueryKey = useCallback((queryKey) => {
    return pages.find(p => p.query_key === queryKey) || null
  }, [pages])

  const getResultsForPage = useCallback((pageId) => {
    return resultsByPage[pageId] || []
  }, [resultsByPage])

  const getAIOverviewForPage = useCallback((pageId) => {
    const overviewId = aiAssignments[pageId]
    if (!overviewId) return null
    return aiOverviews.find(o => o.id === overviewId) || null
  }, [aiAssignments, aiOverviews])

  // ============================================================================
  // PARTICIPANT OPERATIONS
  // ============================================================================

  const addParticipant = useCallback(async (name) => {
    const newParticipant = await createParticipant(name)
    if (newParticipant) {
      // Optimistic update
      setParticipants(prev => [...prev, newParticipant])
    }
    return newParticipant
  }, [])

  const editParticipant = useCallback(async (participantId, updates) => {
    const success = await updateParticipant(participantId, updates)
    if (success) {
      // Optimistic update
      setParticipants(prev => prev.map(p =>
        p.id === participantId ? { ...p, ...updates } : p
      ))
    }
    return success
  }, [])

  const removeParticipant = useCallback(async (participantId) => {
    const success = await deleteParticipant(participantId)
    if (success) {
      // Optimistic update
      setParticipants(prev => prev.filter(p => p.id !== participantId))
    }
    return success
  }, [])

  // Refresh all data manually
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await loadAllUserData()
      setPages(data.pages)
      setResultsByPage(data.resultsByPage)
      setAIOverviews(data.aiOverviews)
      setAIAssignments(data.aiAssignments)
      setParticipants(data.participants)
    } catch (err) {
      console.error('Error refreshing data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    // Data
    pages,
    resultsByPage,
    aiOverviews,
    aiAssignments,
    participants,
    
    // State
    loading,
    error,
    realtimeConnected,
    
    // Page operations
    addPage,
    editPage,
    removePage,
    
    // Result operations
    addResult,
    editResult,
    removeResult,
    reorderResults,
    
    // AI Overview operations
    addAIOverview,
    editAIOverview,
    removeAIOverview,
    
    // AI Assignment operations
    assignAI,
    unassignAI,
    
    // Participant operations
    addParticipant,
    editParticipant,
    removeParticipant,
    
    // Helpers
    getPageById,
    getPageByQueryKey,
    getResultsForPage,
    getAIOverviewForPage,
    refresh
  }
}

export default useRealtimeData
