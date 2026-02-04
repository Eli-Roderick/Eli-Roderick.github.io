import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import SimpleAIOverview from '../components/SimpleAIOverview'
import SearchResult from '../components/SearchResult'
import AdResult from '../components/AdResult'
import ImageManager from '../components/ImageManager'
import RichTextEditor from '../components/RichTextEditor'
import SearchPage from './SearchPage'
import UserAuth from '../components/UserAuth'
import SavingIndicator from '../components/SavingIndicator'
import { loadConfigByPath } from '../utils/config'
import useRealtimeData from '../hooks/useRealtimeData'
import { getCurrentUser } from '../utils/supabase'
import { getAnyActiveSession, addSessionActivity } from '../utils/cloudDataV2'

// Query to config path mapping (only keep hiking boots page as built-in)
const queryToConfig = {
  'best hiking boots': { path: '/configs/query1.json', key: 'hiking-boots' },
  'best+hiking+boots': { path: '/configs/query1.json', key: 'hiking-boots' }
}

// Display name mapping for built-in pages
const displayNames = {
  'hiking-boots': 'Best hiking boots'
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function SearchResultsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get page ID or search query from URL parameters
  // Priority: p (pageId) > q (query text)
  const pageIdParam = searchParams.get('p')
  const searchQuery = searchParams.get('q') || 'best+hiking+boots'

  // User management state - use cached user immediately, verify in background
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return localStorage.getItem('current_user') || null
    } catch {
      return null
    }
  })
  const [authChecked, setAuthChecked] = useState(!!localStorage.getItem('current_user'))

  // Verify Supabase session in background
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser()
        if (user) {
          const username = user.user_metadata?.username ||
            user.user_metadata?.display_name ||
            user.email?.split('@')[0] ||
            'user'
          setCurrentUser(username)
          localStorage.setItem('current_user', username)
        } else {
          // No valid Supabase session - clear localStorage
          setCurrentUser(null)
          localStorage.removeItem('current_user')
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        setCurrentUser(null)
      } finally {
        setAuthChecked(true)
      }
    }
    checkAuth()
  }, [])

  // Use realtime data hook for live sync
  const {
    pages: realtimePages,
    resultsByPage,
    aiOverviews: realtimeAIOverviews,
    aiAssignments,
    loading: realtimeLoading,
    realtimeConnected,
    addPage,
    editPage,
    removePage,
    addResult,
    editResult,
    removeResult,
    reorderResults,
    addAIOverview,
    editAIOverview,
    removeAIOverview,
    assignAI,
    unassignAI,
    getPageById,
    getPageByQueryKey,
    getResultsForPage,
    getAIOverviewForPage,
    refresh: refreshRealtimeData
  } = useRealtimeData(currentUser)

  // Active session tracking
  const [activeSession, setActiveSession] = useState(null)
  const lastScrollY = React.useRef(0)
  const scrollDebounceTimer = React.useRef(null)
  const currentPageNameRef = React.useRef('')
  const currentPageIdRef = React.useRef(null)
  const lastMouseX = React.useRef(0)
  const lastMouseY = React.useRef(0)
  const mouseMoveDebounceTimer = React.useRef(null)

  // Load active session on mount
  useEffect(() => {
    const loadActiveSession = async () => {
      if (!currentUser) {
        setActiveSession(null)
        return
      }
      const session = await getAnyActiveSession()
      setActiveSession(session)
    }
    loadActiveSession()

    // Poll for session changes every 5 seconds (in case session started/ended elsewhere)
    const interval = setInterval(loadActiveSession, 5000)
    return () => clearInterval(interval)
  }, [currentUser])

  // Track mouse wheel events (captures scroll with delta)
  useEffect(() => {
    if (!activeSession) return

    const handleWheel = (e) => {
      const scrollStartY = window.scrollY

      const mouseData = {
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
        event: 'WM_MOUSEWHEEL',
        scrollDelta: Math.round(e.deltaY),
        movementDeltaX: Math.round(e.clientX - lastMouseX.current),
        movementDeltaY: Math.round(e.clientY - lastMouseY.current)
      }

      const scrollDirection = e.deltaY > 0 ? 'SCROLL_DOWN' : 'SCROLL_UP'

      // Wait for scroll animation to complete to get end position
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const scrollEndY = window.scrollY

          addSessionActivity(
            activeSession.id,
            scrollDirection,
            {
              scrollStartY: Math.round(scrollStartY),
              scrollEndY: Math.round(scrollEndY)
            },
            currentPageNameRef.current,
            currentPageIdRef.current,
            activeSession.session_start,
            mouseData
          )
        })
      })

      lastMouseX.current = e.clientX
      lastMouseY.current = e.clientY
    }

    window.addEventListener('wheel', handleWheel, { passive: true })

    return () => {
      window.removeEventListener('wheel', handleWheel)
    }
  }, [activeSession, searchQuery])

  // Track mouse movement
  useEffect(() => {
    if (!activeSession) return

    const handleMouseMove = (e) => {
      const currentX = e.clientX
      const currentY = e.clientY

      // Debounce mouse move events (track every 100ms max)
      if (mouseMoveDebounceTimer.current) {
        clearTimeout(mouseMoveDebounceTimer.current)
      }

      mouseMoveDebounceTimer.current = setTimeout(() => {
        const mouseData = {
          x: Math.round(currentX),
          y: Math.round(currentY),
          event: 'WM_MOUSEMOVE',
          movementDeltaX: Math.round(currentX - lastMouseX.current),
          movementDeltaY: Math.round(currentY - lastMouseY.current)
        }

        addSessionActivity(
          activeSession.id,
          'MOUSE_MOVE',
          null,
          currentPageNameRef.current,
          currentPageIdRef.current,
          activeSession.session_start,
          mouseData
        )

        lastMouseX.current = currentX
        lastMouseY.current = currentY
      }, 100)
    }

    lastMouseX.current = 0
    lastMouseY.current = 0
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (mouseMoveDebounceTimer.current) {
        clearTimeout(mouseMoveDebounceTimer.current)
      }
    }
  }, [activeSession, searchQuery])

  // Track mouse clicks
  useEffect(() => {
    if (!activeSession) return

    const handleClick = (e) => {
      const mouseData = {
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
        event: e.button === 0 ? 'WM_LBUTTONDOWN' : e.button === 2 ? 'WM_RBUTTONDOWN' : 'WM_MBUTTONDOWN',
        movementDeltaX: Math.round(e.clientX - lastMouseX.current),
        movementDeltaY: Math.round(e.clientY - lastMouseY.current)
      }

      addSessionActivity(
        activeSession.id,
        'MOUSE_CLICK',
        { button: e.button, target: e.target.tagName },
        currentPageNameRef.current,
        currentPageIdRef.current,
        activeSession.session_start,
        mouseData
      )

      lastMouseX.current = e.clientX
      lastMouseY.current = e.clientY
    }

    window.addEventListener('mousedown', handleClick)

    return () => {
      window.removeEventListener('mousedown', handleClick)
    }
  }, [activeSession, searchQuery])

  // Track page visibility (tab switches)
  useEffect(() => {
    if (!activeSession) return

    const handleVisibilityChange = () => {
      const activityType = document.hidden ? 'TAB_HIDDEN' : 'TAB_VISIBLE'

      addSessionActivity(
        activeSession.id,
        activityType,
        {
          hidden: document.hidden,
          visibilityState: document.visibilityState
        },
        currentPageNameRef.current,
        currentPageIdRef.current,
        activeSession.session_start
      )
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [activeSession, searchQuery])

  // Function to track URL clicks
  const trackUrlClick = useCallback(async (url, title, type = 'link', event = null) => {
    if (!activeSession) return

    const mouseData = event ? {
      x: Math.round(event.clientX),
      y: Math.round(event.clientY),
      event: 'WM_LBUTTONDOWN',
      movementDeltaX: Math.round(event.clientX - lastMouseX.current),
      movementDeltaY: Math.round(event.clientY - lastMouseY.current)
    } : null

    await addSessionActivity(
      activeSession.id,
      'URL_CLICK',
      { url, title, type },
      currentPageNameRef.current,
      currentPageIdRef.current,
      activeSession.session_start,
      mouseData
    )

    if (event) {
      lastMouseX.current = event.clientX
      lastMouseY.current = event.clientY
    }
  }, [activeSession])

  // Convert realtime pages array to object format for backward compatibility
  const customSearchPages = useMemo(() => {
    const pagesObj = {}
    realtimePages.forEach(page => {
      pagesObj[page.query_key] = {
        id: page.id,
        key: page.search_key,
        query: page.query,
        displayName: page.display_name
      }
    })
    return pagesObj
  }, [realtimePages])

  // Convert resultsByPage to old format (keyed by search_key instead of page_id)
  const customSearchResults = useMemo(() => {
    const resultsObj = {}
    realtimePages.forEach(page => {
      const pageResults = resultsByPage[page.id] || []
      resultsObj[page.search_key] = pageResults.map(r => ({
        id: r.id,
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        favicon: r.favicon,
        company: r.company
      }))
    })
    return resultsObj
  }, [realtimePages, resultsByPage])

  // Convert AI overviews to old format
  const aiOverviews = useMemo(() => {
    return realtimeAIOverviews.map(o => ({
      id: o.id,
      title: o.title,
      text: o.content,
      createdAt: o.created_at
    }))
  }, [realtimeAIOverviews])

  // Keep searchResultAssignments for backward compatibility with modals (keyed by search_key)
  const searchResultAssignments = useMemo(() => {
    const assignments = {}
    realtimePages.forEach(page => {
      const assignment = aiAssignments[page.id]
      if (assignment) {
        assignments[page.search_key] = {
          aiOverviewId: assignment.aiOverviewId,
          fontSize: assignment.fontSize || '14',
          fontFamily: assignment.fontFamily || 'system',
          fontColor: assignment.fontColor ?? ''
        }
      }
    })
    return assignments
  }, [realtimePages, aiAssignments])

  const [loading, setLoading] = useState(true)
  const [deletedBuiltinPages, setDeletedBuiltinPages] = useState([])
  const [resultImages, setResultImages] = useState({})

  // Sync loading state with realtime hook
  useEffect(() => {
    setLoading(realtimeLoading)
  }, [realtimeLoading])

  // Load cached settings from localStorage (for settings not yet in realtime)
  useEffect(() => {
    if (!currentUser) {
      setDeletedBuiltinPages([])
      setResultImages({})
      setUserAIText('')
      setPageAIOverviewSettings({})
      return
    }

    try {
      setDeletedBuiltinPages(getUserData('deleted_builtin_pages', []))
      setUserAIText(getUserData('ai_overview_text', ''))
      setAIOverviewEnabled(getUserData('ai_overview_enabled', true))
      setPageAIOverviewSettings(getUserData('page_ai_overview_settings', {}))

      const savedImages = localStorage.getItem('result_images')
      if (savedImages) setResultImages(JSON.parse(savedImages))
    } catch (error) {
      console.warn('Failed to load cached settings:', error)
    }
  }, [currentUser])

  // Log realtime connection status
  useEffect(() => {
    if (realtimeConnected) {
      console.log('📡 Realtime sync connected')
    }
  }, [realtimeConnected])

  // Helper function kept for backward compatibility
  const checkIfUserHasCloudData = async (username) => {
    return realtimePages.length > 0
  }

  // Find matching config - use useMemo to recalculate when customSearchPages changes
  const searchConfig = useMemo(() => {

    // Try built-in first
    let config = queryToConfig[searchQuery.toLowerCase()]
    if (!config) {
      // Try without URL encoding
      const decodedQuery = searchQuery.replace(/\+/g, ' ').toLowerCase()
      config = Object.values(queryToConfig).find(c =>
        Object.keys(queryToConfig).some(key =>
          key.toLowerCase() === decodedQuery && queryToConfig[key] === c
        )
      )
    }

    // Check custom pages
    if (!config && customSearchPages[searchQuery.toLowerCase()]) {
      const customPage = customSearchPages[searchQuery.toLowerCase()]
      config = {
        path: null, // Custom pages don't have config files
        key: customPage.key
      }
    }

    // Check if this is a deleted built-in page
    if (config && deletedBuiltinPages.includes(config.key)) {
      config = null // Treat as if it doesn't exist
    }

    if (!config) {
      // For unknown queries, create an empty config instead of falling back to hiking boots
      config = {
        path: null,
        key: searchQuery.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      }
    }

    return config
  }, [searchQuery, customSearchPages, deletedBuiltinPages])

  const searchType = searchConfig.key

  // Get the current page object - prefer pageIdParam, fall back to search_key lookup
  const currentPage = useMemo(() => {
    // If page ID is provided in URL, use it directly
    if (pageIdParam) {
      return realtimePages.find(p => p.id === pageIdParam) || null
    }
    // Otherwise fall back to search_key lookup
    return realtimePages.find(p => p.search_key === searchType) || null
  }, [realtimePages, pageIdParam, searchType])

  // Get assignment directly by page ID (more reliable than search_key lookup)
  const currentPageAssignment = useMemo(() => {
    if (!currentPage) return null
    return aiAssignments[currentPage.id] || null
  }, [currentPage, aiAssignments])

  const [config, setConfig] = useState(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [userAIText, setUserAIText] = useState('')
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [draftAIText, setDraftAIText] = useState('')
  const [showImageManager, setShowImageManager] = useState(false)
  const [selectedResultForImages, setSelectedResultForImages] = useState(null)
  const [showAIOverviewManager, setShowAIOverviewManager] = useState(false)
  const [modalView, setModalView] = useState('editor')
  const [draftTitle, setDraftTitle] = useState('')
  const [selectedAIOverviewId, setSelectedAIOverviewId] = useState(null)
  const [showSearchManagement, setShowSearchManagement] = useState(false)
  const [showSearchResultsEditor, setShowSearchResultsEditor] = useState(false)
  const [showNewPageEditor, setShowNewPageEditor] = useState(false)
  const [aiOverviewEnabled, setAIOverviewEnabled] = useState(true)
  const [pageAIOverviewSettings, setPageAIOverviewSettings] = useState({})
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false)

  // User login/logout handlers - restore localStorage functionality
  const handleUserLogin = (username) => {
    console.log(`🔐 User logged in: ${username}`)
    setCurrentUser(username)
    try {
      localStorage.setItem('current_user', username)
    } catch (error) {
      console.warn('Failed to save user to localStorage:', error)
    }
    // Data will be loaded by the useEffect that watches currentUser
  }

  const handleUserLogout = async () => {
    console.log(`🔐 User logged out: ${currentUser}`)

    // Sign out from Supabase
    try {
      const { signOut } = await import('../utils/supabase')
      await signOut()
    } catch (error) {
      console.warn('Supabase signOut error:', error)
    }

    setCurrentUser(null)
    try {
      localStorage.removeItem('current_user')
    } catch (error) {
      console.warn('Failed to remove user from localStorage:', error)
    }

    // Clear local-only state (realtime hook clears its own data)
    setDeletedBuiltinPages([])
    setResultImages({})
    setUserAIText('')
    setPageAIOverviewSettings({})
    setSelectedAIOverviewId(null)
  }

  // Refresh data from realtime hook
  const handleRefreshFromCloud = () => {
    refreshRealtimeData()
  }



  // AI text is now loaded through user data system

  // Load config based on search query
  useEffect(() => {
    const configPath = searchConfig.path

    // Handle custom pages (no config file)
    if (!configPath && customSearchPages[searchQuery.toLowerCase()]) {
      const customPage = customSearchPages[searchQuery.toLowerCase()]
      setConfig({
        query: customPage.displayName,
        results: [],
        ads: [],
        aiOverview: { show: true, text: '' }
      })
      setLoading(false)
      return
    }

    // Handle unknown queries (no config file, not a saved custom page)
    if (!configPath) {
      const config = {
        query: searchQuery.replace(/\+/g, ' '), // Display the actual search query
        results: [],
        ads: [],
        aiOverview: { show: true, text: '' }
      }
      setConfig(config)
      setLoading(false)
      return
    }

    setLoading(true)
    loadConfigByPath(configPath)
      .then((loadedConfig) => {
        setConfig(loadedConfig)
      })
      .catch((e) => {
        console.error('- Config loading failed:', e)
        setError(String(e))
      })
      .finally(() => setLoading(false))
  }, [searchConfig.path, searchQuery, customSearchPages, deletedBuiltinPages])

  // Load assigned AI overview for current search type (using direct ID lookup)
  useEffect(() => {
    if (currentPage && aiOverviews.length > 0) {
      if (currentPageAssignment?.aiOverviewId) {
        const assignedOverview = aiOverviews.find(overview => overview.id === currentPageAssignment.aiOverviewId)
        if (assignedOverview) {
          setSelectedAIOverviewId(assignedOverview.id)
          setUserAIText(assignedOverview.text)
          setAIOverviewEnabled(true)
        }
      }
      // Don't clear AI overview if there's no assignment - user might have manually set text
    }
    // Don't clear AI overview for pages without assignments - preserve user's manual text
  }, [currentPage, currentPageAssignment, aiOverviews])

  // Note: Removed the useEffect that was clearing AI text for custom pages without assignments
  // This was causing user's manually set AI text to be deleted on refresh

  // Get display query - use current page's display name if available
  const getDisplayQuery = () => {
    // If we have a current page (from ID or search_key lookup), use its display name
    if (currentPage) {
      return currentPage.display_name || currentPage.query || searchQuery.replace(/\+/g, ' ')
    }

    // Check if current page has a custom display name (built-in pages)
    if (displayNames[searchType]) {
      return displayNames[searchType]
    }

    // Check custom pages by search key
    const customPage = Object.values(customSearchPages).find(page => page.key === searchType)
    if (customPage) {
      return customPage.displayName
    }

    // Fallback to search query
    return searchQuery.replace(/\+/g, ' ')
  }

  const displayQuery = getDisplayQuery()

  // Keep page name and ID refs updated for session tracking
  useEffect(() => {
    currentPageNameRef.current = displayQuery
    currentPageIdRef.current = currentPage?.id || null
  }, [displayQuery, currentPage])

  const handleResultClick = ({ query, url, title, type = 'result' }) => {
    // Track session activity
    trackUrlClick(url, title || url, type)
  }

  const effectiveConfig = useMemo(() => {
    try {
      if (!config) {
        // Return a basic fallback config instead of null
        return {
          results: [],
          aiOverview: { show: false, text: '' }
        }
      }

      const defaultResults = config.results || []

      // Get custom results - prefer currentPage.id lookup, fall back to searchType
      const pageKey = currentPage?.search_key || searchType
      const customResults = customSearchResults[pageKey] || []

      // Convert custom results to the same format as default results
      const formattedCustomResults = customResults.map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        favicon: result.favicon,
        company: result.company
      }))

      // For custom pages, use userAIText only if there's content or an assignment
      const isCustomPage = !!currentPage || customSearchPages[searchQuery.toLowerCase()]
      const hasAssignment = !!currentPageAssignment
      const aiText = (isCustomPage && !hasAssignment && !userAIText.trim()) ? '' : userAIText

      // Check if AI Overview is enabled for this specific page
      const pageAIEnabled = pageAIOverviewSettings[searchType] !== false

      // Get font settings from assignment (using direct ID lookup)
      const aiFontSize = currentPageAssignment?.fontSize || '14'
      const aiFontFamily = currentPageAssignment?.fontFamily || 'system'
      // Use nullish coalescing to preserve empty string (theme default) vs undefined
      const aiFontColor = currentPageAssignment?.fontColor ?? ''

      return {
        ...config,
        // If there are custom results for this search type, use ONLY those in the
        // exact order configured in "Manage Search Results > View Results".
        // Otherwise, fall back to the built-in config results.
        results: formattedCustomResults.length > 0
          ? formattedCustomResults
          : defaultResults,
        aiOverview: {
          ...(config.aiOverview || {}),
          show: pageAIEnabled, // Show AI Overview only if enabled for this page
          text: aiText
        },
        aiFontSize,
        aiFontFamily,
        aiFontColor,
      }
    } catch (error) {
      console.error('Error in effectiveConfig useMemo:', error)
      // Return safe fallback config
      return {
        results: [],
        aiOverview: { show: false, text: '' }
      }
    }
  }, [config, customSearchResults, searchType, userAIText, customSearchPages, searchQuery, currentPage, currentPageAssignment, aiOverviewEnabled, pageAIOverviewSettings])

  const handlePaste = (e) => {
    // ...
    const clipboard = e.clipboardData
    const html = clipboard?.getData('text/html') || ''
    const text = clipboard?.getData('text') || ''
    const content = html || text
    if (content) {
      e.preventDefault()
      setUserAIText(content)
      // REMOVED auto-save - now manual save only
    }
  }

  const openPasteModal = () => {
    if (selectedAIOverviewId || userAIText) {
      setModalView('editor')
      const selectedOverview = aiOverviews.find(overview => overview.id === selectedAIOverviewId)
      if (selectedOverview) {
        setDraftTitle(selectedOverview.title)
        setDraftAIText(selectedOverview.text)
      } else {
        setDraftTitle('')
        setDraftAIText(userAIText)
      }
    } else {
      setModalView('list')
    }
    setShowPasteModal(true)
  }

  const savePasteModal = async () => {
    if (selectedAIOverviewId) {
      await updateAIOverviewHandler(selectedAIOverviewId, draftTitle.trim() || `AI Overview ${aiOverviews.length + 1}`, draftAIText)
    } else if (modalView === 'editor' && draftAIText !== userAIText) {
      const newId = await createAIOverviewHandler(draftTitle.trim() || `AI Overview ${aiOverviews.length + 1}`, draftAIText)
      if (newId) setSelectedAIOverviewId(newId)
    }
    setUserAIText(draftAIText)
    setShowPasteModal(false)
  }

  const clearAIOverview = () => {
    setDraftTitle('')
    setDraftAIText('')
    setUserAIText('')
    setSelectedAIOverviewId(null)
  }

  const handleBackToList = () => {
    setModalView('list')
  }

  const handleSelectFromList = (overview) => {
    setModalView('editor')
    setDraftTitle(overview.title)
    setDraftAIText(overview.text)
    selectAIOverview(overview.id)
  }

  const handleCreateNew = () => {
    setModalView('editor')
    setDraftTitle('')
    setDraftAIText('')
    setSelectedAIOverviewId(null)
  }

  const handleDeleteOverview = (overviewId) => {
    if (confirm('Are you sure you want to delete this AI Overview? This action cannot be undone.')) {
      // Remove from aiOverviews array
      const updatedOverviews = aiOverviews.filter(overview => overview.id !== overviewId)
      setAIOverviews(updatedOverviews)

      // REMOVED auto-save - now manual save only

      // If this was the selected overview, clear it
      if (selectedAIOverviewId === overviewId) {
        setSelectedAIOverviewId(null)
        setUserAIText('')
        // REMOVED auto-save - now manual save only
      }

      // Remove any assignments to this overview
      const updatedAssignments = { ...searchResultAssignments }
      Object.keys(updatedAssignments).forEach(searchType => {
        if (updatedAssignments[searchType]?.aiOverviewId === overviewId) {
          delete updatedAssignments[searchType]
        }
      })
      setSearchResultAssignments(updatedAssignments)
      // REMOVED auto-save - now manual save only
    }
  }

  const handleImagesUpdate = (resultUrl, images) => {
    const newResultImages = {
      ...resultImages,
      [resultUrl]: images
    }

    if (images.length === 0) {
      delete newResultImages[resultUrl]
    }

    setResultImages(newResultImages)
  }

  const openImageManager = (result) => {
    setSelectedResultForImages(result)
    setShowImageManager(true)
  }

  const clearAllImages = () => {
    setResultImages({})
    try {
      localStorage.removeItem('result_images')
    } catch (error) {
      console.warn('Failed to clear images from localStorage:', error)
    }
  }

  // REMOVED ALL AUTO-SAVE useEffect hooks to prevent data conflicts
  // All saves are now manual only to prevent overwrites when multiple users
  // are logged into the same account on different computers

  // Update userAIText when selected AI overview changes
  useEffect(() => {
    if (selectedAIOverviewId) {
      const selectedOverview = aiOverviews.find(overview => overview.id === selectedAIOverviewId)
      if (selectedOverview) {
        setUserAIText(selectedOverview.text)
      }
    }
  }, [selectedAIOverviewId, aiOverviews])

  // AI Overview management functions - now using realtime hook
  const createAIOverviewHandler = async (title, text) => {
    const newOverview = await addAIOverview({
      title: title.trim() || `AI Overview ${aiOverviews.length + 1}`,
      content: text.trim()
    })
    return newOverview?.id || null
  }

  const selectAIOverview = (id) => {
    setSelectedAIOverviewId(id)
  }

  const deleteAIOverviewHandler = async (id) => {
    await removeAIOverview(id)

    if (selectedAIOverviewId === id) {
      setSelectedAIOverviewId(null)
      setUserAIText('')
    }
  }

  const updateAIOverviewHandler = async (id, title, text) => {
    await editAIOverview(id, {
      title: title.trim(),
      content: text.trim()
    })
  }

  // Generate shareable URL for current AI overview
  const generateShareableURL = (overviewId = null) => {
    const targetId = overviewId || selectedAIOverviewId
    if (!targetId) return window.location.origin + window.location.pathname

    const overview = aiOverviews.find(o => o.id === targetId)
    if (!overview) return window.location.origin + window.location.pathname

    // Create URL-friendly slug from title
    const slug = overview.title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')

    const baseUrl = `${window.location.origin}/search/${searchType}`
    return `${baseUrl}?ai=${slug}`
  }

  // Assign AI overview to search result type - now using realtime hook
  const assignAIOverviewToSearch = async (searchResultType, overviewId) => {
    // Find the page by search_key
    const page = realtimePages.find(p => p.search_key === searchResultType)
    if (page) {
      await assignAI(page.id, overviewId)
    }

    // If we're assigning to the current search type, update immediately
    if (searchResultType === searchType) {
      const overview = aiOverviews.find(o => o.id === overviewId)
      if (overview) {
        setSelectedAIOverviewId(overviewId)
        setUserAIText(overview.text)
      }
    }
  }

  // Remove AI overview assignment from search result type - now using realtime hook
  const removeAIOverviewFromSearch = async (searchResultType) => {
    const page = realtimePages.find(p => p.search_key === searchResultType)
    if (page) {
      await unassignAI(page.id)
    }

    // If we're removing from current search type, clear immediately
    if (searchResultType === searchType) {
      setSelectedAIOverviewId(null)
      setUserAIText('')
    }
  }

  // Toggle AI Overview for a specific page
  const togglePageAIOverview = (pageKey, enabled) => {
    try {
      if (!pageKey || typeof pageKey !== 'string') {
        console.warn('togglePageAIOverview: Invalid pageKey', { pageKey, enabled })
        return
      }

      const currentSettings = pageAIOverviewSettings || {}
      const newSettings = {
        ...currentSettings,
        [pageKey]: Boolean(enabled)
      }
      setPageAIOverviewSettings(newSettings)

      // REMOVED auto-save - now manual save only
    } catch (error) {
      console.error('Error in togglePageAIOverview:', error)
    }
  }

  // Check if AI Overview is enabled for a specific page
  const isPageAIOverviewEnabled = (pageKey) => {
    try {
      // If no specific setting exists, default to true (enabled)
      if (!pageKey || typeof pageKey !== 'string') {
        return true
      }
      if (!pageAIOverviewSettings || typeof pageAIOverviewSettings !== 'object') {
        return true
      }
      return pageAIOverviewSettings[pageKey] !== false
    } catch (error) {
      console.error('Error in isPageAIOverviewEnabled:', error)
      return true // Safe default
    }
  }

  // Generate favicon URL from domain - use DuckDuckGo for better transparency
  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname
      return `https://icons.duckduckgo.com/ip3/${domain}.ico`
    } catch {
      return `https://icons.duckduckgo.com/ip3/example.com.ico`
    }
  }

  // Note: Seeding of results is now handled by the realtime data layer
  // Built-in results come from config files, custom results from the database

  // Add custom search result - now uses realtime hook
  const addCustomSearchResult = async (searchResultType, result) => {
    // Find the page by search_key
    const page = realtimePages.find(p => p.search_key === searchResultType)
    if (!page) {
      console.warn('Cannot add result: page not found for', searchResultType)
      return
    }

    await addResult(page.id, {
      searchType: searchResultType,
      title: result.title,
      url: result.url,
      snippet: result.snippet || '',
      favicon: getFaviconUrl(result.url)
    })
  }

  // Update custom search result - now uses realtime hook
  const updateCustomSearchResult = async (searchResultType, resultId, updatedResult) => {
    const page = realtimePages.find(p => p.search_key === searchResultType)
    if (!page) return

    await editResult(resultId, page.id, {
      title: updatedResult.title,
      url: updatedResult.url,
      snippet: updatedResult.snippet || '',
      favicon: getFaviconUrl(updatedResult.url)
    })
  }

  // Remove custom search result - now uses realtime hook
  const removeCustomSearchResult = async (searchResultType, resultId) => {
    const page = realtimePages.find(p => p.search_key === searchResultType)
    if (!page) return

    await removeResult(resultId, page.id)
  }

  // Add custom search page - now uses realtime hook
  const addCustomSearchPage = async (pageData) => {
    const queryKey = pageData.query.toLowerCase().replace(/\s+/g, '+')
    const searchKey = pageData.query.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    const newPage = await addPage({
      queryKey,
      searchKey,
      query: pageData.query,
      displayName: pageData.displayName || pageData.query
    })

    return newPage ? queryKey : null
  }

  // Update page display name - now uses realtime hook
  const updatePageDisplayName = async (pageKey, pageType, newDisplayName) => {
    if (pageType === 'custom') {
      // Find the page by search_key
      const page = realtimePages.find(p => p.search_key === pageKey)
      if (page) {
        await editPage(page.id, { display_name: newDisplayName })
      }
    } else {
      // For built-in pages, store in localStorage for now
      const updatedDisplayNames = {
        ...displayNames,
        [pageKey]: newDisplayName
      }
      Object.assign(displayNames, updatedDisplayNames)
    }
  }

  // Remove custom search page - now uses realtime hook
  const removeCustomSearchPage = async (pageKey) => {
    const page = realtimePages.find(p => p.query_key === pageKey)
    if (page) {
      await removePage(page.id)
    }
  }

  // Reorder search results - now uses realtime hook
  const reorderSearchResultsHandler = async (searchType, fromIndex, toIndex) => {
    const page = realtimePages.find(p => p.search_key === searchType)
    if (!page) return

    const results = resultsByPage[page.id] || []
    const reorderedIds = [...results.map(r => r.id)]
    const [movedId] = reorderedIds.splice(fromIndex, 1)
    reorderedIds.splice(toIndex, 0, movedId)

    await reorderResults(page.id, reorderedIds)
  }

  // Delete built-in page (still uses local state for now)
  const deleteBuiltinPage = (pageKey) => {
    const updatedDeleted = [...deletedBuiltinPages, pageKey]
    setDeletedBuiltinPages(updatedDeleted)
    setUserData('deleted_builtin_pages', updatedDeleted)
  }

  // Show loading while checking auth - use theme background to prevent flash
  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }} />
    )
  }

  // Do not render a dedicated loading screen; allow the page shell to appear immediately.
  if (loading && !config) {
    return <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }} />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-600 hover:underline"
          >
            ← Reload Page
          </button>
        </div>
      </div>
    )
  }

  if (!searchConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Search query "{searchQuery}" not found</p>
          <button
            onClick={() => navigateWithAdmin('/search?q=best+hiking+boots&oq=best+hiking+boots&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8')}
            className="text-blue-600 hover:underline"
          >
            ← Go to Hiking Boots Search
          </button>
        </div>
      </div>
    )
  }

  // Redirect to home if no user is logged in
  if (!currentUser) {
    navigate('/')
    return null
  }

  return (
    <div className="min-h-screen">
      <SavingIndicator />
      {/* Header */}
      <header className="search-header relative">
        {/* Profile row - mobile only */}
        <div className="md:hidden flex justify-end px-4 pt-3 pb-2">
          <div className="profile-menu-wrapper">
            <div className="profile-avatar">
              <div className="profile-avatar-inner">
                <span className="profile-avatar-initial">{currentUser ? currentUser.charAt(0).toUpperCase() : 'U'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top row: search bar + controls */}
        <div className="px-4 md:pl-48 md:pr-6 pt-2 md:pt-6 pb-1 md:pb-3 flex items-center gap-2 md:gap-4">

          <div className="flex-1">
            {/* Desktop search bar */}
            <div className="search-bar hidden md:flex">
              <input
                className="flex-1 outline-none text-[16px]"
                value={displayQuery}
                readOnly
                onPaste={handlePaste}
                placeholder="Paste text here to set AI Overview"
                title={userAIText ? 'AI Overview text overridden by pasted content' : 'Paste to override AI Overview'}
              />
              <div className="search-affordances">
                <button className="material-symbols-outlined icon-plain" aria-label="Clear" title="Clear">close</button>
                <span className="separator" />
                <button className="material-symbols-outlined icon-plain" aria-label="Search" title="Search">search</button>
              </div>
            </div>

            {/* Mobile search bar */}
            <div className="search-bar md:hidden flex">
              <button className="material-symbols-outlined icon-plain mr-2" aria-label="Search" title="Search">search</button>
              <input
                className="flex-1 outline-none text-[16px]"
                value={displayQuery}
                readOnly
                onPaste={handlePaste}
                placeholder="Paste text here to set AI Overview"
                title={userAIText ? 'AI Overview text overridden by pasted content' : 'Paste to override AI Overview'}
              />
              <div className="search-affordances">
                <button className="material-symbols-outlined icon-plain" aria-label="Clear" title="Clear">close</button>
                <span className="separator" />
                <button className="material-symbols-outlined icon-plain" aria-label="Voice search" title="Voice search">mic</button>
              </div>
            </div>
          </div>

          {/* Desktop controls */}
          <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            <div className="profile-menu-wrapper" style={{ cursor: 'default' }} onClick={(e) => {
              if (e.ctrlKey) {
                e.preventDefault()
                e.stopPropagation()
                navigate('/')
              }
            }}>
              <div className="profile-avatar">
                <div className="profile-avatar-inner">
                  <span className="profile-avatar-initial">{currentUser ? currentUser.charAt(0).toUpperCase() : 'U'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs row */}
        <div className="px-4 md:pl-52 md:pr-6 mt-0 md:mt-2">
          <nav className="tabs flex gap-6 md:gap-8 text-sm overflow-x-auto">
            {['All', 'Images', 'Videos', 'Shopping', 'News', 'More'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${activeTab === tab ? 'active' : 'inactive'}`}
              >
                {tab}
              </button>
            ))}
          </nav>
          <div className="tabs-divider" />
        </div>
      </header>

      {/* Content */}
      <main className="px-4 md:pl-52 md:pr-6 py-1 md:py-6">
        {error && <div className="text-red-600">{error}</div>}
        {!error && effectiveConfig && (
          <SearchPage
            key={`${searchType}-${effectiveConfig?.aiFontSize}-${effectiveConfig?.aiFontFamily}`}
            config={effectiveConfig}
            onResultClick={handleResultClick}
            resultImages={resultImages}
            onImagesUpdate={handleImagesUpdate}
            selectedResultForImages={selectedResultForImages}
            onCloseImageEditor={() => setSelectedResultForImages(null)}
            userAIText={userAIText}
            aiOverviewEnabled={aiOverviewEnabled}
            aiFontSize={effectiveConfig?.aiFontSize}
            aiFontFamily={effectiveConfig?.aiFontFamily}
            aiFontColor={effectiveConfig?.aiFontColor}
          />
        )}
      </main>

      {/* Enhanced Search Management Modal */}
      {showSearchManagement && (
        <EnhancedSearchManagementModal
          isOpen={showSearchManagement}
          onClose={() => setShowSearchManagement(false)}
          currentSearchType={searchType}
          displayNames={displayNames}
          customSearchPages={customSearchPages}
          customSearchResults={customSearchResults}
          searchResultAssignments={searchResultAssignments}
          aiOverviews={aiOverviews}
          onNavigate={(page) => {
            setShowSearchManagement(false)
            if (page.id && page.type === 'custom') {
              navigateWithAdmin(`/search?p=${page.id}`)
            } else {
              navigateWithAdmin(`/search?q=${page.queryKey}&oq=${page.queryKey}&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8`)
            }
          }}
          onAssignAI={assignAIOverviewToSearch}
          onRemoveAI={removeAIOverviewFromSearch}
          onDeletePage={removeCustomSearchPage}
          onDeleteBuiltinPage={deleteBuiltinPage}
          onEditResults={(searchType) => {
            setShowSearchManagement(false)
            setShowSearchResultsEditor(true)
          }}
          onReorderResults={reorderSearchResultsHandler}
          removeCustomSearchResult={removeCustomSearchResult}
          updatePageDisplayName={updatePageDisplayName}
          pageAIOverviewSettings={pageAIOverviewSettings}
          togglePageAIOverview={togglePageAIOverview}
          isPageAIOverviewEnabled={isPageAIOverviewEnabled}
          queryToConfig={queryToConfig}
          deletedBuiltinPages={deletedBuiltinPages}
        />
      )}

      {/* Search Results Editor Modal */}
      {showSearchResultsEditor && (
        <SearchResultsEditorModal
          isOpen={showSearchResultsEditor}
          onClose={() => setShowSearchResultsEditor(false)}
          searchType={searchType}
          searchTypeName={displayNames[searchType]}
          customResults={customSearchResults[searchType] || []}
          onAddResult={(result) => addCustomSearchResult(searchType, result)}
          onUpdateResult={(resultId, result) => updateCustomSearchResult(searchType, resultId, result)}
          onRemoveResult={(resultId) => removeCustomSearchResult(searchType, resultId)}
        />
      )}

      {/* New Page Editor Modal */}
      {showNewPageEditor && (
        <NewPageEditorModal
          isOpen={showNewPageEditor}
          onClose={() => setShowNewPageEditor(false)}
          onCreatePage={(pageData) => {
            const queryKey = addCustomSearchPage(pageData)
            setShowNewPageEditor(false)
            // Navigate to the new page
            navigateWithAdmin(`/search?q=${queryKey}&oq=${queryKey}&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8`)
          }}
        />
      )}

      {/* Enhanced Paste Modal */}
      {showPasteModal && (
        <div style={{
          position: 'fixed',
          top: '0px',
          left: '0px',
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999999,
          pointerEvents: 'all'
        }} onClick={() => {
          if (modalView === 'editor') {
            savePasteModal()
          } else {
            setUserAIText('')
            setSelectedAIOverviewId(null)
            setShowPasteModal(false)
          }
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '700px',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            zIndex: 1000000,
            pointerEvents: 'all',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            maxHeight: '85vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }} onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--card-bg)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {modalView === 'editor' && (aiOverviews.length > 0 || selectedAIOverviewId) && (
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={handleBackToList}
                  >
                    ←
                  </button>
                )}
                <h2 style={{ margin: 0, color: 'var(--text)', fontSize: '18px', fontWeight: '600' }}>
                  {modalView === 'editor' ? 'Set AI Overview Text' : 'AI Overview Manager'}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* AI Overview Toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'var(--bg)',
                  borderRadius: '6px',
                  border: '1px solid var(--border)'
                }}>
                  <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: '600' }}>AI Overview</span>
                  <label style={{ position: 'relative', display: 'inline-block', width: '52px', height: '28px' }}>
                    <input
                      type="checkbox"
                      checked={aiOverviewEnabled}
                      onChange={(e) => setAIOverviewEnabled(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: aiOverviewEnabled ? '#007bff' : '#ccc',
                      transition: '0.3s',
                      borderRadius: '28px',
                      boxShadow: aiOverviewEnabled ? '0 0 0 2px rgba(0, 123, 255, 0.25)' : 'none'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '""',
                        height: '22px',
                        width: '22px',
                        left: aiOverviewEnabled ? '27px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        transition: '0.3s',
                        borderRadius: '50%',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                      }}></span>
                    </span>
                  </label>
                  <span style={{
                    fontSize: '12px',
                    color: aiOverviewEnabled ? '#007bff' : 'var(--muted)',
                    fontWeight: '500'
                  }}>
                    {aiOverviewEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: 'var(--muted)'
                  }}
                  onClick={() => {
                    if (modalView === 'editor') {
                      savePasteModal()
                    } else {
                      setUserAIText('')
                      setSelectedAIOverviewId(null)
                      setShowPasteModal(false)
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--card-bg)',
              flex: 1,
              overflow: 'auto'
            }}>
              {modalView === 'editor' ? (
                <>
                  {/* Title Input */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
                      AI Overview Title
                    </label>
                    <input
                      type="text"
                      placeholder="Enter a title for this AI overview..."
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--card-bg)',
                        color: 'var(--text)',
                        fontSize: '14px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem', color: 'var(--muted)', fontSize: '14px' }}>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Tip:</strong> You can include images by pasting image URLs (jpg, png, gif, webp, svg, bmp).</p>
                    <p style={{ margin: '0 0 4px 0' }}><strong>Examples:</strong></p>
                    <p style={{ margin: '0 0 4px 0' }}>• Single image: [https://example.com/image.jpg]</p>
                    <p style={{ margin: '0 0 4px 0' }}>• Horizontal row: {'{[image1.jpg][image2.jpg][image3.jpg]}'}</p>
                    <p style={{ margin: '0' }}>• Use curly braces { } to group images into scrollable rows</p>
                  </div>
                  <RichTextEditor
                    value={draftAIText}
                    onChange={setDraftAIText}
                    placeholder="Paste your AI overview content here..."
                  />
                </>
              ) : (
                <>
                  {/* Create New Button */}
                  <button
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#1a73e8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontSize: '14px',
                      cursor: 'pointer',
                      marginBottom: '1rem',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#1557b0'}
                    onMouseLeave={(e) => e.target.style.background = '#1a73e8'}
                    onClick={handleCreateNew}
                  >
                    + Create New AI Overview
                  </button>

                  {/* AI Overviews List */}
                  <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                    {aiOverviews.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                        <p style={{ margin: '0.5rem 0' }}>No AI overviews created yet.</p>
                        <p style={{ margin: '0.5rem 0' }}>Create your first one to get started!</p>
                      </div>
                    ) : (
                      aiOverviews.map(overview => (
                        <div
                          key={overview.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            padding: '1rem',
                            border: `1px solid ${selectedAIOverviewId === overview.id ? 'var(--primary)' : 'var(--border)'}`,
                            borderRadius: '8px',
                            marginBottom: '0.75rem',
                            background: selectedAIOverviewId === overview.id ? 'color-mix(in hsl, var(--primary), transparent 95%)' : 'var(--card-bg)',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleSelectFromList(overview)}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>{overview.title}</h3>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                                  {new Date(overview.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteOverview(overview.id)
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px',
                                    transition: 'background-color 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(220, 38, 38, 0.1)'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                  title="Delete AI Overview"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
                              {overview.text.length > 150
                                ? overview.text.substring(0, 150) + '...'
                                : overview.text}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {modalView === 'editor' && (
              <div style={{
                padding: '1rem',
                borderTop: '1px solid var(--border)',
                backgroundColor: 'var(--card-bg)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                flexShrink: 0
              }}>
                <button
                  style={{
                    padding: '8px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text)',
                    cursor: 'pointer'
                  }}
                  onClick={clearAIOverview}
                >
                  Clear
                </button>
                <button
                  style={{
                    padding: '8px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowPasteModal(false)}
                >
                  Cancel
                </button>
                <button
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                  onClick={savePasteModal}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Manager */}
      <ImageManager
        isOpen={showImageManager}
        onClose={() => setShowImageManager(false)}
        results={effectiveConfig?.results || []}
        resultImages={resultImages}
        onImagesUpdate={handleImagesUpdate}
        onClearAll={clearAllImages}
      />

      {/* Finalize Study Session Dialog */}
      {showFinalizeDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={() => setShowFinalizeDialog(false)}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            textAlign: 'center'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: '1.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--tab-active)' }}>
                task_alt
              </span>
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '20px', fontWeight: '600', color: 'var(--text)' }}>
              Finalize Study Session
            </h2>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '14px', color: 'var(--muted)' }}>
              Are you ready to end this study session and return to the home page?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setShowFinalizeDialog(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowFinalizeDialog(false)
                  navigate('/')
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: 'var(--tab-active)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// Search Results Editor Modal Component
function SearchResultsEditorModal({
  isOpen,
  onClose,
  searchType,
  searchTypeName,
  customResults,
  onAddResult,
  onUpdateResult,
  onRemoveResult
}) {
  const [editingResult, setEditingResult] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    snippet: '',
    rating: '',
    price: '',
    reviews: ''
  })

  // Parse existing rating data from snippet
  const parseRatingFromSnippet = (snippet) => {
    if (!snippet) return { cleanSnippet: snippet, rating: '', price: '', reviews: '' }
    const match = snippet.match(/\[\[rating:([^\]]+)\]\]/)
    if (!match) return { cleanSnippet: snippet, rating: '', price: '', reviews: '' }

    const params = match[1].split(':')
    const rating = params[0] || ''
    let price = ''
    let reviews = ''

    for (let i = 1; i < params.length; i += 2) {
      if (params[i] === 'price') price = params[i + 1] || ''
      if (params[i] === 'reviews') reviews = params[i + 1] || ''
    }

    const cleanSnippet = snippet.replace(/\[\[rating:[^\]]+\]\]/, '').trim()
    return { cleanSnippet, rating, price, reviews }
  }

  // Build snippet with rating tag
  const buildSnippetWithRating = (snippet, rating, price, reviews) => {
    let result = snippet.trim()
    if (rating) {
      let ratingTag = `[[rating:${rating}`
      if (price) ratingTag += `:price:${price}`
      if (reviews) ratingTag += `:reviews:${reviews}`
      ratingTag += ']]'
      result = result + ' ' + ratingTag
    }
    return result
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.url.trim() || !formData.snippet.trim()) {
      alert('Please fill in all fields')
      return
    }

    const finalSnippet = buildSnippetWithRating(formData.snippet, formData.rating, formData.price, formData.reviews)
    const submitData = { ...formData, snippet: finalSnippet }

    if (editingResult) {
      onUpdateResult(editingResult.id, submitData)
    } else {
      onAddResult(submitData)
    }

    setFormData({ title: '', url: '', snippet: '', rating: '', price: '', reviews: '' })
    setEditingResult(null)
  }

  const handleEdit = (result) => {
    setEditingResult(result)
    const { cleanSnippet, rating, price, reviews } = parseRatingFromSnippet(result.snippet)
    setFormData({
      title: result.title,
      url: result.url,
      snippet: cleanSnippet,
      rating,
      price,
      reviews
    })
  }

  const handleCancel = () => {
    setFormData({ title: '', url: '', snippet: '', rating: '', price: '', reviews: '' })
    setEditingResult(null)
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: '0px',
      left: '0px',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 999999,
      pointerEvents: 'all'
    }} onClick={onClose}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '900px',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        zIndex: 1000000,
        pointerEvents: 'all',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: '#16a34a',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Edit Search Results - {searchTypeName}
          </h2>
          <button
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'white'
            }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--card-bg)',
          flex: 1,
          overflow: 'auto'
        }}>
          {/* Add/Edit Form */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
              {editingResult ? 'Edit Search Result' : 'Add New Search Result'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter the page title"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
                  URL *
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com/page"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
                    Snippet *
                  </label>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#1a73e8',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'help',
                        border: '1px solid #1a73e8'
                      }}
                      title={`SNIPPET FORMATTING HELP

You can add special formatting to your snippets:

📝 RATING STARS (use the fields below, or manually):
   [[rating:4.8]]
   [[rating:4.8:price:US$88.00]]
   [[rating:4.8:reviews:45]]
   [[rating:4.8:price:US$88.00:reviews:45]]

💡 EXAMPLE SNIPPET:
"Constructed with premium waterproof nubuck leather and nylon uppers, these boots are lightweight, flexible, and built to keep your feet comfortable without..."

With rating fields filled:
• Rating: 4.9
• Price: US$88.00
• Reviews: 45

Result displays as:
"Constructed with premium waterproof..."
US$88.00 · 4.9 ★★★★★ (45)`}
                    >
                      ?
                    </span>
                  </div>
                </div>
                <textarea
                  value={formData.snippet}
                  onChange={(e) => setFormData({ ...formData, snippet: e.target.value })}
                  placeholder="Enter the description/snippet that appears under the title"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                  required
                />
              </div>

              {/* Rating Section */}
              <div style={{
                padding: '1rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                backgroundColor: 'color-mix(in srgb, var(--card-bg) 95%, var(--text) 5%)'
              }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                  ⭐ Review Rating (Optional)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '12px', color: 'var(--muted)' }}>
                      Rating (e.g., 4.8)
                    </label>
                    <input
                      type="text"
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                      placeholder="4.8"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--card-bg)',
                        color: 'var(--text)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '12px', color: 'var(--muted)' }}>
                      Price (e.g., US$88.00)
                    </label>
                    <input
                      type="text"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="US$88.00"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--card-bg)',
                        color: 'var(--text)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '12px', color: 'var(--muted)' }}>
                      Review Count
                    </label>
                    <input
                      type="text"
                      value={formData.reviews}
                      onChange={(e) => setFormData({ ...formData, reviews: e.target.value })}
                      placeholder="45"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--card-bg)',
                        color: 'var(--text)',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
                {formData.rating && (
                  <div style={{ marginTop: '0.75rem', fontSize: '13px', color: 'var(--muted)' }}>
                    Preview: {formData.price && <span>{formData.price} · </span>}{formData.rating} <span style={{ color: '#f5c518' }}>★★★★★</span>{formData.reviews && <span> ({formData.reviews})</span>}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#16a34a',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {editingResult ? 'Update Result' : 'Add Result'}
                </button>
                {editingResult && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--card-bg)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Existing Results */}
          <div>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
              Custom Search Results ({customResults.length})
            </h3>

            {customResults.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                No custom search results yet. Add one above to get started.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {customResults.map(result => (
                  <div key={result.id} style={{
                    padding: '1rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card-bg)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <img
                        src={result.favicon}
                        alt="Favicon"
                        style={{ width: '20px', height: '20px', marginTop: '2px', flexShrink: 0, borderRadius: '50%', border: '1px solid var(--border)' }}
                        onError={(e) => {
                          if (e.target.src !== `https://icons.duckduckgo.com/ip3/example.com.ico`) {
                            e.target.src = `https://icons.duckduckgo.com/ip3/example.com.ico`
                          } else {
                            e.target.style.display = 'none'
                          }
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '16px', fontWeight: '500', color: '#1a0dab' }}>
                          {result.title}
                        </h4>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '12px', color: '#006621' }}>
                          {result.url}
                        </p>
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)', lineHeight: '1.4' }}>
                          {result.snippet}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button
                          onClick={() => handleEdit(result)}
                          style={{
                            padding: '0.5rem',
                            border: '1px solid #2563eb',
                            borderRadius: '4px',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onRemoveResult(result.id)}
                          style={{
                            padding: '0.5rem',
                            border: '1px solid #dc2626',
                            borderRadius: '4px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// New Page Editor Modal Component
function NewPageEditorModal({ isOpen, onClose, onCreatePage }) {
  const [formData, setFormData] = useState({
    query: '',
    displayName: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.query.trim() || !formData.displayName.trim()) {
      alert('Please fill in all fields')
      return
    }

    onCreatePage(formData)
    setFormData({ query: '', displayName: '' })
  }

  const handleQueryChange = (e) => {
    const query = e.target.value
    setFormData({
      ...formData,
      query,
      // Auto-generate display name if it's empty
      displayName: formData.displayName || query
    })
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: '0px',
      left: '0px',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 999999,
      pointerEvents: 'all'
    }} onClick={onClose}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '600px',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        zIndex: 1000000,
        pointerEvents: 'all',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: '#2563eb',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            Create New Search Page
          </h2>
          <button
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'white'
            }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '2rem',
          backgroundColor: 'var(--card-bg)',
          flex: 1,
          overflow: 'auto'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '14px', color: 'var(--muted)', lineHeight: '1.5' }}>
              Create a completely new search page with its own URL. After creating the page, you can add custom search results to it using the management system.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
                Search Query *
              </label>
              <input
                type="text"
                value={formData.query}
                onChange={handleQueryChange}
                placeholder="e.g., best laptops 2024, healthy recipes, travel tips"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text)',
                  fontSize: '14px'
                }}
                required
              />
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                This will be the search query that appears in the URL and search bar
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
                Display Name *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g., Best Laptops 2024, Healthy Recipes, Travel Tips"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text)',
                  fontSize: '14px'
                }}
                required
              />
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                This will be the friendly name shown in the management interface
              </p>
            </div>

            {/* Preview */}
            {formData.query && (
              <div style={{
                padding: '1rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                backgroundColor: 'color-mix(in hsl, var(--card-bg), var(--border) 10%)'
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                  Preview:
                </h4>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--muted)' }}>
                  <strong>URL:</strong> /search?q={formData.query.toLowerCase().replace(/\s+/g, '+')}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                  <strong>Search Bar:</strong> {formData.query}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Create Page
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// FIXED Search Management Modal - ONLY 2 TABS
function EnhancedSearchManagementModal({
  isOpen,
  onClose,
  currentSearchType,
  displayNames,
  customSearchPages,
  customSearchResults,
  searchResultAssignments,
  aiOverviews,
  onNavigate,
  onAssignAI,
  onRemoveAI,
  onDeletePage,
  onDeleteBuiltinPage,
  onEditResults,
  onReorderResults,
  removeCustomSearchResult,
  updatePageDisplayName,
  pageAIOverviewSettings,
  togglePageAIOverview,
  isPageAIOverviewEnabled,
  queryToConfig,
  deletedBuiltinPages
}) {
  const [activeTab, setActiveTab] = useState('pages')
  const [selectedPageForResults, setSelectedPageForResults] = useState(null)
  const [builtinResults, setBuiltinResults] = useState({})
  const [pageSearchQuery, setPageSearchQuery] = useState('')
  const [editingPageName, setEditingPageName] = useState(null)
  const [editingDisplayName, setEditingDisplayName] = useState('')

  if (!isOpen) return null

  try {
    // Combine built-in and custom pages for unified view, excluding deleted built-in pages
    const allPages = [
      ...Object.entries(displayNames)
        .filter(([key]) => !deletedBuiltinPages.includes(key))
        .map(([key, name]) => ({
          key,
          name,
          type: 'built-in',
          queryKey: Object.keys(queryToConfig).find(q => queryToConfig[q].key === key),
          customResultCount: customSearchResults[key]?.length || 0
        })),
      ...Object.entries(customSearchPages).map(([queryKey, page]) => ({
        key: page.key,
        name: page.displayName,
        type: 'custom',
        queryKey,
        customResultCount: customSearchResults[page.key]?.length || 0
      }))
    ]

    // Load default (code-defined) results for built-in pages so they can be viewed in the
    // "View Results" screen even before any custom results are added.
    useEffect(() => {
      if (!isOpen) return

      const loadBuiltinResults = async () => {
        const resultsMap = {}

        const builtinPages = allPages.filter((page) => page.type === 'built-in')

        await Promise.all(
          builtinPages.map(async (page) => {
            const configEntry = Object.entries(queryToConfig).find(
              ([, cfg]) => cfg.key === page.key
            )
            const configPath = configEntry && configEntry[1] && configEntry[1].path
            if (!configPath) return

            try {
              const cfg = await loadConfigByPath(configPath)
              resultsMap[page.key] = cfg.results || []
            } catch (error) {
              console.warn('Failed to load built-in results for page', page.key, error)
            }
          })
        )

        setBuiltinResults(resultsMap)
      }

      loadBuiltinResults()
    }, [isOpen, queryToConfig, displayNames, customSearchPages])

    // Note: Seeding is now handled by the realtime data layer
    // Built-in results are displayed from config, custom results from database

    // Filter pages based on search query
    const filteredPages = allPages.filter(page =>
      page.name.toLowerCase().includes(pageSearchQuery.toLowerCase()) ||
      (page.queryKey && page.queryKey.toLowerCase().includes(pageSearchQuery.toLowerCase()))
    )

    // Helper functions for editing page names
    const startEditingPageName = (page) => {
      setEditingPageName(page.key)
      setEditingDisplayName(page.name)
    }

    const savePageNameEdit = (page) => {
      if (editingDisplayName.trim()) {
        updatePageDisplayName(page.key, page.type, editingDisplayName.trim())
      }
      setEditingPageName(null)
      setEditingDisplayName('')
    }

    const cancelPageNameEdit = () => {
      setEditingPageName(null)
      setEditingDisplayName('')
    }

    // ONLY TWO TABS - NO OVERVIEW TAB
    const TABS_ONLY_TWO = [
      { id: 'pages', label: 'Pages & Results', icon: '📄' },
      { id: 'ai-assignments', label: 'AI Assignments', icon: '🤖' }
    ]

    return (
      <div style={{
        position: 'fixed',
        top: '0px',
        left: '0px',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 999999,
        pointerEvents: 'all'
      }} onClick={onClose}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '95%',
          maxWidth: '1400px',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          zIndex: 1000000,
          pointerEvents: 'all',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }} onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <div>
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '24px', fontWeight: '700' }}>
                Manage Search Results
              </h2>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                Manage pages, results, and AI assignments
              </p>
            </div>
            <button
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                fontSize: '18px',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {/* ONLY 2 TABS - Navigation */}
          <div style={{
            padding: '0 1.5rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--card-bg)',
            display: 'flex',
            gap: '0.5rem'
          }}>
            {TABS_ONLY_TWO.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '1rem 1.5rem',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '3px solid #667eea' : '3px solid transparent',
                  backgroundColor: activeTab === tab.id ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                  color: activeTab === tab.id ? '#667eea' : 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.id ? '600' : '500',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{
            padding: '1.5rem',
            backgroundColor: 'var(--card-bg)',
            flex: 1,
            overflow: 'auto'
          }}>
            {activeTab === 'pages' && !selectedPageForResults && (
              <div>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '20px', fontWeight: '600', color: 'var(--text)' }}>
                  📄 All Search Pages
                </h3>

                {/* Search input */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    placeholder="Search pages..."
                    value={pageSearchQuery}
                    onChange={(e) => setPageSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '400px',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--card-bg)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  {filteredPages.map(page => {
                    const pageResults = customSearchResults[page.key] || []
                    return (
                      <div key={page.key} style={{
                        padding: '1.5rem',
                        border: `2px solid ${currentSearchType === page.key ? '#667eea' : 'var(--border)'}`,
                        borderRadius: '8px',
                        backgroundColor: currentSearchType === page.key ? 'rgba(102, 126, 234, 0.05)' : 'var(--card-bg)',
                        transition: 'all 0.2s ease'
                      }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              {editingPageName === page.key ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                  <input
                                    type="text"
                                    value={editingDisplayName}
                                    onChange={(e) => setEditingDisplayName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') savePageNameEdit(page)
                                      if (e.key === 'Escape') cancelPageNameEdit()
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: '0.5rem',
                                      border: '1px solid #667eea',
                                      borderRadius: '4px',
                                      fontSize: '16px',
                                      fontWeight: '600',
                                      backgroundColor: 'var(--card-bg)',
                                      color: 'var(--text)'
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => savePageNameEdit(page)}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      border: 'none',
                                      borderRadius: '4px',
                                      backgroundColor: '#16a34a',
                                      color: 'white',
                                      cursor: 'pointer',
                                      fontSize: '12px'
                                    }}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={cancelPageNameEdit}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      border: 'none',
                                      borderRadius: '4px',
                                      backgroundColor: '#dc2626',
                                      color: 'white',
                                      cursor: 'pointer',
                                      fontSize: '12px'
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text)', cursor: 'pointer' }}
                                  onClick={() => startEditingPageName(page)}
                                  title="Click to edit search bar text">
                                  {page.name}
                                  <span style={{
                                    marginLeft: '0.5rem',
                                    fontSize: '11px',
                                    color: 'var(--muted)',
                                    fontWeight: 'normal'
                                  }}>
                                    ✏️
                                  </span>
                                </h4>
                              )}
                              {currentSearchType === page.key && <span style={{ color: '#667eea', fontSize: '14px', fontWeight: '500' }}>(Current)</span>}
                              <span style={{
                                fontSize: '12px',
                                fontWeight: 'normal',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '12px',
                                backgroundColor: page.type === 'custom' ? '#3b82f6' : '#8b5cf6',
                                color: 'white'
                              }}>
                                {page.type === 'custom' ? 'Custom' : 'Built-in'}
                              </span>
                            </div>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '14px', color: 'var(--muted)' }}>
                              {pageResults.length} custom results • {searchResultAssignments[page.key]?.aiOverviewId ? 'AI assigned' : 'No AI assigned'}
                            </p>
                            {page.type === 'custom' && (
                              <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                                URL: /search?p={page.id}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onNavigate(page)}
                              style={{
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: '#667eea',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Visit Page
                            </button>
                            <button
                              onClick={() => setSelectedPageForResults(page)}
                              style={{
                                padding: '0.5rem 1rem',
                                border: '1px solid #16a34a',
                                borderRadius: '4px',
                                backgroundColor: '#16a34a',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              View Results
                            </button>
                            <button
                              onClick={() => {
                                const confirmMessage = page.type === 'custom'
                                  ? `Delete "${page.name}" page and all its search results?`
                                  : `Delete "${page.name}" built-in page? This will remove it from the interface but can be restored by refreshing the page data.`
                                if (confirm(confirmMessage)) {
                                  if (page.type === 'custom') {
                                    onDeletePage(page.queryKey)
                                  } else {
                                    onDeleteBuiltinPage(page.key)
                                  }
                                }
                              }}
                              style={{
                                padding: '0.5rem 1rem',
                                border: '1px solid #dc2626',
                                borderRadius: '4px',
                                backgroundColor: '#dc2626',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'pages' && selectedPageForResults && (
              <PageResultsView
                page={selectedPageForResults}
                pageResults={customSearchResults[selectedPageForResults.key] || []}
                onBack={() => setSelectedPageForResults(null)}
                onEditResult={() => onEditResults(selectedPageForResults.key)}
                onAddResult={() => onEditResults(selectedPageForResults.key)}
                onDeleteResult={(resultId) => {
                  removeCustomSearchResult(selectedPageForResults.key, resultId)
                  setSelectedPageForResults({ ...selectedPageForResults })
                }}
                onReorderResults={(fromIndex, toIndex) => onReorderResults(selectedPageForResults.key, fromIndex, toIndex)}
              />
            )}

            {activeTab === 'ai-assignments' && (
              <div>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '20px', fontWeight: '600', color: 'var(--text)' }}>
                  🤖 AI Overview Assignments
                </h3>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  {allPages.map(page => (
                    <div key={page.key} style={{
                      padding: '1.5rem',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      backgroundColor: 'var(--card-bg)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                            {page.name}
                            <span style={{
                              marginLeft: '0.5rem',
                              fontSize: '12px',
                              fontWeight: 'normal',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '12px',
                              backgroundColor: page.type === 'custom' ? '#3b82f6' : '#8b5cf6',
                              color: 'white'
                            }}>
                              {page.type === 'custom' ? 'Custom' : 'Built-in'}
                            </span>
                          </h4>
                          <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
                            {searchResultAssignments[page.key]?.aiOverviewId ? 'AI Overview assigned' : 'No AI Overview assigned'}
                          </p>
                        </div>

                        {/* AI Overview Toggle Switch */}
                        {(() => {
                          // Compute the enabled state once to avoid multiple function calls
                          const pageAIEnabled = pageAIOverviewSettings ? pageAIOverviewSettings[page.key] !== false : true

                          return (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.5rem 0.75rem',
                              backgroundColor: 'var(--bg)',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              flexShrink: 0
                            }}>
                              <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: '500' }}>AI Overview</span>
                              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                                <input
                                  type="checkbox"
                                  checked={pageAIEnabled}
                                  onChange={(e) => {
                                    if (togglePageAIOverview) {
                                      togglePageAIOverview(page.key, e.target.checked)
                                    }
                                  }}
                                  style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                  position: 'absolute',
                                  cursor: 'pointer',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  backgroundColor: pageAIEnabled ? '#007bff' : '#ccc',
                                  transition: '0.3s',
                                  borderRadius: '24px',
                                  boxShadow: pageAIEnabled ? '0 0 0 2px rgba(0, 123, 255, 0.25)' : 'none'
                                }}>
                                  <span style={{
                                    position: 'absolute',
                                    content: '""',
                                    height: '18px',
                                    width: '18px',
                                    left: pageAIEnabled ? '23px' : '3px',
                                    bottom: '3px',
                                    backgroundColor: 'white',
                                    transition: '0.3s',
                                    borderRadius: '50%',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                                  }}></span>
                                </span>
                              </label>
                              <span style={{
                                fontSize: '12px',
                                color: pageAIEnabled ? '#007bff' : 'var(--muted)',
                                fontWeight: '500',
                                minWidth: '24px'
                              }}>
                                {pageAIEnabled ? 'ON' : 'OFF'}
                              </span>
                            </div>
                          )
                        })()}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--card-bg)',
                            color: 'var(--text)',
                            fontSize: '14px'
                          }}
                          value={searchResultAssignments[page.key]?.aiOverviewId || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              onAssignAI(page.key, e.target.value)
                            } else {
                              onRemoveAI(page.key)
                            }
                          }}
                        >
                          <option value="">No AI Overview</option>
                          {aiOverviews.map(overview => (
                            <option key={overview.id} value={overview.id}>
                              {overview.title}
                            </option>
                          ))}
                        </select>
                        {searchResultAssignments[page.key]?.aiOverviewId && (
                          <button
                            style={{
                              padding: '0.75rem',
                              border: '1px solid #dc3545',
                              borderRadius: '4px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            onClick={() => onRemoveAI(page.key)}
                            title="Remove assignment"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  } catch (error) {
    // Log the error and return a safe fallback
    console.error('Error in EnhancedSearchManagementModal:', error)
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#dc3545', marginBottom: '1rem' }}>Modal Error</h3>
          <p style={{ marginBottom: '1rem' }}>The search management modal encountered an error and couldn't load properly.</p>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    )
  }
}

// Page Results View Component
function PageResultsView({ page, pageResults, onBack, onEditResult, onAddResult, onDeleteResult, onReorderResults }) {
  const totalResults = pageResults?.length || 0

  return (
    <div>
      {/* Header with back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={onBack}
          style={{
            padding: '0.5rem',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: 'var(--card-bg)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          ← Back to All Pages
        </button>
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '20px', fontWeight: '600', color: 'var(--text)' }}>
            {page.name} - Search Results
            <span style={{
              marginLeft: '0.5rem',
              fontSize: '12px',
              fontWeight: 'normal',
              padding: '0.25rem 0.5rem',
              borderRadius: '12px',
              backgroundColor: page.type === 'custom' ? '#3b82f6' : '#8b5cf6',
              color: 'white'
            }}>
              {page.type === 'custom' ? 'Custom' : 'Built-in'}
            </span>
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
            {totalResults} search results • Drag and drop to reorder
          </p>
        </div>
      </div>

      {/* Add New Result Button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={onAddResult}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#16a34a',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          + Add New Search Result
        </button>
      </div>

      {/* Results List */}
      {totalResults > 0 ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {pageResults.map((result, index) => (
            <div
              key={result.id}
              draggable={true}
              style={{
                padding: '1.5rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                backgroundColor: 'var(--card-bg)',
                transition: 'all 0.2s ease',
                cursor: 'grab',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginLeft: '20px' }}>
                <img
                  src={result.favicon}
                  alt="Favicon"
                  style={{ width: '20px', height: '20px', marginTop: '2px', flexShrink: 0, borderRadius: '50%', border: '1px solid var(--border)' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '16px', fontWeight: '500', color: '#1a0dab', lineHeight: '1.3' }}>
                    {result.title}
                  </h4>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '14px', color: '#006621', wordBreak: 'break-all' }}>
                    {result.url}
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)', lineHeight: '1.5' }}>
                    {result.snippet}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: '600' }}>
                    #{index + 1}
                  </div>
                  <button
                    onClick={() => onEditResult(result)}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #2563eb',
                      borderRadius: '4px',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this search result?')) {
                        onDeleteResult(result.id)
                      }
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #dc2626',
                      borderRadius: '4px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          border: '2px dashed var(--border)',
          borderRadius: '8px',
          backgroundColor: 'rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>
            No Search Results Yet
          </h4>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '14px', color: 'var(--muted)' }}>
            This page doesn't have any custom search results. Add some to get started!
          </p>
          <button
            onClick={onAddResult}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#16a34a',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Add First Search Result
          </button>
        </div>
      )}
    </div>
  )
}
