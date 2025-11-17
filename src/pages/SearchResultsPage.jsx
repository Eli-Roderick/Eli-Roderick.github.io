import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import SimpleAIOverview from '../components/SimpleAIOverview'
import SearchResult from '../components/SearchResult'
import AdResult from '../components/AdResult'
import ImageManager from '../components/ImageManager'
import RichTextEditor from '../components/RichTextEditor'
import SearchPage from './SearchPage'
import { ClickLogger } from '../utils/logger'
import { loadConfigByPath } from '../utils/config'

const logger = new ClickLogger()

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
  const isAdmin = typeof window !== 'undefined' && window.location.href.toLowerCase().endsWith('admin')
  
  // Helper function to preserve admin parameter in navigation
  const navigateWithAdmin = (url) => {
    const finalUrl = isAdmin ? `${url}admin` : url
    navigate(finalUrl)
  }
  
  // Get search query from URL parameters
  const searchQuery = searchParams.get('q') || 'best+hiking+boots'
  console.log('SearchResultsPage loading with query:', searchQuery)
  
  // Load custom search pages first (needed for searchConfig calculation)
  const [customSearchPages, setCustomSearchPages] = useState(() => {
    try {
      const saved = localStorage.getItem('custom_search_pages')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })
  
  // Load deleted built-in pages (needed for searchConfig calculation)
  const [deletedBuiltinPages, setDeletedBuiltinPages] = useState(() => {
    try {
      const saved = localStorage.getItem('deleted_builtin_pages')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  
  // Find matching config - use useMemo to recalculate when customSearchPages changes
  const searchConfig = useMemo(() => {
    console.log('Calculating searchConfig for query:', searchQuery)
    console.log('Available customSearchPages:', Object.keys(customSearchPages))
    
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
      console.log('Found custom page:', customPage)
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
      console.log('Created default config for unknown query:', config)
    }
    
    console.log('Final searchConfig:', config)
    return config
  }, [searchQuery, customSearchPages, deletedBuiltinPages])
  
  const searchType = searchConfig.key
  
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [userAIText, setUserAIText] = useState('')
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [draftAIText, setDraftAIText] = useState('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showImageManager, setShowImageManager] = useState(false)
  const [selectedResultForImages, setSelectedResultForImages] = useState(null)
  const [showAIOverviewManager, setShowAIOverviewManager] = useState(false)
  const [modalView, setModalView] = useState('editor')
  const [draftTitle, setDraftTitle] = useState('')
  const [showClickTracker, setShowClickTracker] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(() => {
    try {
      return localStorage.getItem('click_tracking_user_id') || ''
    } catch {
      return ''
    }
  })
  const [clickLogs, setClickLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('click_logs')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })
  const [aiOverviews, setAIOverviews] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_overviews')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [selectedAIOverviewId, setSelectedAIOverviewId] = useState(null)
  const [searchResultAssignments, setSearchResultAssignments] = useState(() => {
    try {
      const saved = localStorage.getItem('search_result_assignments')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })
  const [showSearchManagement, setShowSearchManagement] = useState(false)
  const [showSearchResultsEditor, setShowSearchResultsEditor] = useState(false)
  const [showNewPageEditor, setShowNewPageEditor] = useState(false)
  const [customSearchResults, setCustomSearchResults] = useState(() => {
    try {
      const saved = localStorage.getItem('custom_search_results')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })
  const [aiOverviewEnabled, setAIOverviewEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_overview_enabled')
      return saved !== null ? JSON.parse(saved) : true
    } catch {
      return true
    }
  })
  const [pageAIOverviewSettings, setPageAIOverviewSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('page_ai_overview_settings')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })
  const [resultImages, setResultImages] = useState(() => {
    try {
      const saved = localStorage.getItem('result_images')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Load persisted AI text on mount
  useEffect(() => {
    try {
      const savedText = localStorage.getItem('ai_overview_text')
      if (savedText) setUserAIText(savedText)
    } catch {}
  }, [])

  // Load config based on search query
  useEffect(() => {
    console.log('Loading config useEffect triggered')
    console.log('- searchConfig:', searchConfig)
    console.log('- searchQuery:', searchQuery)
    console.log('- customSearchPages keys:', Object.keys(customSearchPages))
    
    const configPath = searchConfig.path
    console.log('- configPath:', configPath)
    
    // Handle custom pages (no config file)
    if (!configPath && customSearchPages[searchQuery.toLowerCase()]) {
      const customPage = customSearchPages[searchQuery.toLowerCase()]
      console.log('- Loading custom page:', customPage)
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
      console.log('- Loading unknown query config')
      const config = {
        query: searchQuery.replace(/\+/g, ' '), // Display the actual search query
        results: [],
        ads: [],
        aiOverview: { show: true, text: '' }
      }
      console.log('- Setting config for unknown query:', config)
      setConfig(config)
      setLoading(false)
      return
    }

    console.log('- Loading config from path:', configPath)
    setLoading(true)
    loadConfigByPath(configPath)
      .then((loadedConfig) => {
        console.log('- Config loaded successfully:', loadedConfig)
        setConfig(loadedConfig)
      })
      .catch((e) => {
        console.error('- Config loading failed:', e)
        setError(String(e))
      })
      .finally(() => setLoading(false))
  }, [searchConfig.path, searchQuery, customSearchPages, deletedBuiltinPages])

  // Load assigned AI overview for current search type
  useEffect(() => {
    if (searchType && aiOverviews.length > 0) {
      const assignedOverviewId = searchResultAssignments[searchType]
      if (assignedOverviewId) {
        const assignedOverview = aiOverviews.find(overview => overview.id === assignedOverviewId)
        if (assignedOverview) {
          setSelectedAIOverviewId(assignedOverview.id)
          setUserAIText(assignedOverview.text)
          setAIOverviewEnabled(true)
        }
      }
      // Don't clear AI overview if there's no assignment - user might have manually set text
    }
    // Don't clear AI overview for pages without assignments - preserve user's manual text
  }, [searchType, aiOverviews, searchResultAssignments])

  // Note: Removed the useEffect that was clearing AI text for custom pages without assignments
  // This was causing user's manually set AI text to be deleted on refresh

  // Get display query - use custom display name if available, otherwise use search query
  const getDisplayQuery = () => {
    // Check if current page has a custom display name
    if (displayNames[searchType]) {
      return displayNames[searchType]
    }
    
    // Check custom pages
    const customPage = Object.values(customSearchPages).find(page => page.key === searchType)
    if (customPage) {
      return customPage.displayName
    }
    
    // Fallback to search query
    return searchQuery.replace(/\+/g, ' ')
  }
  
  const displayQuery = getDisplayQuery()

  const handleResultClick = ({ query, url }) => {
    logger.log({ query, url })
    logClick('search_result', url)
  }

  const handleDownload = () => logger.downloadCSV()

  const effectiveConfig = useMemo(() => {
    if (!config) return null
    
    const defaultResults = config.results || []
    const customResults = customSearchResults[searchType] || []
    
    // Convert custom results to the same format as default results
    const formattedCustomResults = customResults.map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      favicon: result.favicon
    }))
    
    // For custom pages, use userAIText only if there's content or an assignment
    const isCustomPage = customSearchPages[searchQuery.toLowerCase()]
    const hasAssignment = searchResultAssignments[searchType]
    const aiText = (isCustomPage && !hasAssignment && !userAIText.trim()) ? '' : userAIText
    
    // Check if AI Overview is enabled for this specific page
    const pageAIEnabled = isPageAIOverviewEnabled(searchType)
    
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
    }
  }, [config, customSearchResults, searchType, userAIText, customSearchPages, searchQuery, searchResultAssignments, aiOverviewEnabled, pageAIOverviewSettings])

  const handlePaste = (e) => {
    // ...
    const clipboard = e.clipboardData
    const html = clipboard?.getData('text/html') || ''
    const text = clipboard?.getData('text') || ''
    const content = html || text
    if (content) {
      e.preventDefault()
      setUserAIText(content)
      try { localStorage.setItem('ai_overview_text', content) } catch {}
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

  const savePasteModal = () => {
    if (selectedAIOverviewId) {
      updateAIOverview(selectedAIOverviewId, draftTitle.trim() || `AI Overview ${aiOverviews.length + 1}`, draftAIText)
    } else if (modalView === 'editor' && draftAIText !== userAIText) {
      const newId = createAIOverview(draftTitle.trim() || `AI Overview ${aiOverviews.length + 1}`, draftAIText)
      // Only select the new overview if we're creating it for the current context
      setSelectedAIOverviewId(newId)
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
      
      // Update localStorage
      localStorage.setItem('ai_overviews', JSON.stringify(updatedOverviews))
      
      // If this was the selected overview, clear it
      if (selectedAIOverviewId === overviewId) {
        setSelectedAIOverviewId(null)
        setUserAIText('')
        localStorage.removeItem('ai_overview_text')
      }
      
      // Remove any assignments to this overview
      const updatedAssignments = { ...searchResultAssignments }
      Object.keys(updatedAssignments).forEach(key => {
        if (updatedAssignments[key] === overviewId) {
          delete updatedAssignments[key]
        }
      })
      setSearchResultAssignments(updatedAssignments)
      localStorage.setItem('search_result_assignments', JSON.stringify(updatedAssignments))
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

  // Click tracking functions
  const logClick = (element, url = null) => {
    if (!currentUserId) return
    
    const clickData = {
      timestamp: new Date().toISOString(),
      element: element,
      url: url,
      query: config?.query || '',
      page: window.location.href
    }
    
    const userLogs = clickLogs[currentUserId] || []
    const updatedLogs = {
      ...clickLogs,
      [currentUserId]: [...userLogs, clickData]
    }
    
    setClickLogs(updatedLogs)
    try {
      localStorage.setItem('click_logs', JSON.stringify(updatedLogs))
    } catch (error) {
      console.warn('Failed to save click logs:', error)
    }
  }

  const setUserId = (userId) => {
    setCurrentUserId(userId)
    try {
      localStorage.setItem('click_tracking_user_id', userId)
    } catch (error) {
      console.warn('Failed to save user ID:', error)
    }
  }

  const downloadClickLogs = (userId) => {
    const userLogs = clickLogs[userId] || []
    if (userLogs.length === 0) {
      alert('No click logs found for this user')
      return
    }
    
    const csv = [
      'Timestamp,Element,URL,Query,Page',
      ...userLogs.map(log => 
        `"${log.timestamp}","${log.element}","${log.url || ''}","${log.query}","${log.page}"`
      )
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `click_logs_${userId}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Save result images to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('result_images', JSON.stringify(resultImages))
    } catch (error) {
      console.warn('Failed to save images to localStorage:', error)
    }
  }, [resultImages])

  // Save AI overviews to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('ai_overviews', JSON.stringify(aiOverviews))
    } catch (error) {
      console.warn('Failed to save AI overviews to localStorage:', error)
    }
  }, [aiOverviews])

  // Note: Removed localStorage persistence for selectedAIOverviewId to prevent jumping between overviews

  // Save AI overview enabled state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('ai_overview_enabled', JSON.stringify(aiOverviewEnabled))
    } catch (error) {
      console.warn('Failed to save AI overview enabled state to localStorage:', error)
    }
  }, [aiOverviewEnabled])

  // Save page AI overview settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('page_ai_overview_settings', JSON.stringify(pageAIOverviewSettings))
    } catch (error) {
      console.warn('Failed to save page AI overview settings to localStorage:', error)
    }
  }, [pageAIOverviewSettings])

  // Save search result assignments to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('search_result_assignments', JSON.stringify(searchResultAssignments))
    } catch (error) {
      console.warn('Failed to save search result assignments to localStorage:', error)
    }
  }, [searchResultAssignments])

  // Save custom search results to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('custom_search_results', JSON.stringify(customSearchResults))
    } catch (error) {
      console.warn('Failed to save custom search results to localStorage:', error)
    }
  }, [customSearchResults])

  // Save custom search pages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('custom_search_pages', JSON.stringify(customSearchPages))
    } catch (error) {
      console.warn('Failed to save custom search pages to localStorage:', error)
    }
  }, [customSearchPages])

  // Save deleted built-in pages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('deleted_builtin_pages', JSON.stringify(deletedBuiltinPages))
    } catch (error) {
      console.warn('Failed to save deleted built-in pages to localStorage:', error)
    }
  }, [deletedBuiltinPages])

  // Update userAIText when selected AI overview changes
  useEffect(() => {
    if (selectedAIOverviewId) {
      const selectedOverview = aiOverviews.find(overview => overview.id === selectedAIOverviewId)
      if (selectedOverview) {
        setUserAIText(selectedOverview.text)
      }
    }
  }, [selectedAIOverviewId, aiOverviews])

  // AI Overview management functions
  const createAIOverview = (title, text) => {
    const newOverview = {
      id: Date.now().toString(),
      title: title.trim() || `AI Overview ${aiOverviews.length + 1}`,
      text: text.trim(),
      createdAt: new Date().toISOString()
    }
    
    const updatedOverviews = [...aiOverviews, newOverview]
    setAIOverviews(updatedOverviews)
    // Don't automatically select the new overview - let user explicitly choose
    return newOverview.id
  }

  const selectAIOverview = (id) => {
    setSelectedAIOverviewId(id)
  }

  const deleteAIOverview = (id) => {
    const updatedOverviews = aiOverviews.filter(overview => overview.id !== id)
    setAIOverviews(updatedOverviews)
    
    if (selectedAIOverviewId === id) {
      setSelectedAIOverviewId(null)
      setUserAIText('')
    }
  }

  const updateAIOverview = (id, title, text) => {
    const updatedOverviews = aiOverviews.map(overview => 
      overview.id === id 
        ? { ...overview, title: title.trim(), text: text.trim() }
        : overview
    )
    setAIOverviews(updatedOverviews)
  }

  // Generate shareable URL for current AI overview
  const generateShareableURL = (overviewId = null) => {
    const targetId = overviewId || selectedAIOverviewId
    if (!targetId) return window.location.origin + window.location.pathname
    
    const overview = aiOverviews.find(o => o.id === targetId)
    if (!overview) return window.location.origin + window.location.pathname
    
    // Create URL-friendly slug from title
    const slug = overview.title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-') // Remove leading/trailing hyphens
    
    const baseUrl = `${window.location.origin}/search/${searchType}`
    return `${baseUrl}?ai=${slug}`
  }

  // Assign AI overview to search result type
  const assignAIOverviewToSearch = (searchResultType, overviewId) => {
    const newAssignments = {
      ...searchResultAssignments,
      [searchResultType]: overviewId
    }
    setSearchResultAssignments(newAssignments)
    
    // If we're assigning to the current search type, update immediately
    if (searchResultType === searchType) {
      const overview = aiOverviews.find(o => o.id === overviewId)
      if (overview) {
        setSelectedAIOverviewId(overviewId)
        setUserAIText(overview.text)
        setAIOverviewEnabled(true)
      }
    }
  }

  // Remove AI overview assignment from search result type
  const removeAIOverviewFromSearch = (searchResultType) => {
    const newAssignments = { ...searchResultAssignments }
    delete newAssignments[searchResultType]
    setSearchResultAssignments(newAssignments)
    
    // If we're removing from current search type, clear immediately
    if (searchResultType === searchType) {
      setSelectedAIOverviewId(null)
      setUserAIText('')
    }
  }

  // Toggle AI Overview for a specific page
  const togglePageAIOverview = (pageKey, enabled) => {
    if (!pageKey) return
    
    const currentSettings = pageAIOverviewSettings || {}
    const newSettings = {
      ...currentSettings,
      [pageKey]: enabled
    }
    setPageAIOverviewSettings(newSettings)
  }

  // Check if AI Overview is enabled for a specific page
  const isPageAIOverviewEnabled = (pageKey) => {
    // If no specific setting exists, default to true (enabled)
    if (!pageAIOverviewSettings || typeof pageAIOverviewSettings !== 'object') {
      return true
    }
    return pageAIOverviewSettings[pageKey] !== false
  }

  // Generate favicon URL from domain
  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    } catch {
      return `https://www.google.com/s2/favicons?domain=example.com&sz=32`
    }
  }

  // Seed editable custom results from built-in config results when none exist yet
  useEffect(() => {
    if (!config || !config.results || !config.results.length || !searchType) return
    const existing = customSearchResults[searchType]
    if (existing && existing.length > 0) return

    const seeded = config.results.map((r) => ({
      id: `${Date.now().toString()}-${Math.random().toString(36).slice(2)}`,
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      favicon: getFaviconUrl(r.url),
      createdAt: new Date().toISOString(),
    }))

    const newResults = {
      ...customSearchResults,
      [searchType]: seeded,
    }
    setCustomSearchResults(newResults)
  }, [config, searchType])

  // Add custom search result
  const addCustomSearchResult = (searchResultType, result) => {
    const newResults = {
      ...customSearchResults,
      [searchResultType]: [
        ...(customSearchResults[searchResultType] || []),
        {
          ...result,
          id: Date.now().toString(),
          favicon: getFaviconUrl(result.url),
          createdAt: new Date().toISOString()
        }
      ]
    }
    setCustomSearchResults(newResults)
  }

  // Update custom search result
  const updateCustomSearchResult = (searchResultType, resultId, updatedResult) => {
    const newResults = {
      ...customSearchResults,
      [searchResultType]: (customSearchResults[searchResultType] || []).map(result =>
        result.id === resultId 
          ? { ...result, ...updatedResult, favicon: getFaviconUrl(updatedResult.url) }
          : result
      )
    }
    setCustomSearchResults(newResults)
  }

  // Remove custom search result
  const removeCustomSearchResult = (searchResultType, resultId) => {
    const newResults = {
      ...customSearchResults,
      [searchResultType]: (customSearchResults[searchResultType] || []).filter(result => result.id !== resultId)
    }
    setCustomSearchResults(newResults)
  }

  // Add custom search page
  const addCustomSearchPage = (pageData) => {
    const queryKey = pageData.query.toLowerCase().replace(/\s+/g, '+')
    const searchKey = pageData.query.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    
    const newPages = {
      ...customSearchPages,
      [queryKey]: {
        ...pageData,
        key: searchKey,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      }
    }
    setCustomSearchPages(newPages)
    
    // Initialize empty custom results for this page
    setCustomSearchResults({
      ...customSearchResults,
      [searchKey]: []
    })
    
    return queryKey
  }

  // Update page display name (search bar text)
  const updatePageDisplayName = (pageKey, pageType, newDisplayName) => {
    if (pageType === 'custom') {
      // Find the custom page by its key and update its displayName
      const updatedPages = { ...customSearchPages }
      Object.keys(updatedPages).forEach(queryKey => {
        if (updatedPages[queryKey].key === pageKey) {
          updatedPages[queryKey] = {
            ...updatedPages[queryKey],
            displayName: newDisplayName
          }
        }
      })
      setCustomSearchPages(updatedPages)
    } else {
      // For built-in pages, we'll store custom display names separately
      const updatedDisplayNames = {
        ...displayNames,
        [pageKey]: newDisplayName
      }
      // Note: This won't persist across page reloads for built-in pages
      // You might want to store this in localStorage if persistence is needed
      Object.assign(displayNames, updatedDisplayNames)
    }
  }

  // Remove custom search page
  const removeCustomSearchPage = (pageKey) => {
    const updatedPages = { ...customSearchPages }
    delete updatedPages[pageKey]
    setCustomSearchPages(updatedPages)
    localStorage.setItem('custom_search_pages', JSON.stringify(updatedPages))
  }

  const reorderSearchResults = (searchType, fromIndex, toIndex) => {
    const results = [...(customSearchResults[searchType] || [])]
    const [movedItem] = results.splice(fromIndex, 1)
    results.splice(toIndex, 0, movedItem)
    
    const updatedResults = {
      ...customSearchResults,
      [searchType]: results
    }
    
    setCustomSearchResults(updatedResults)
    localStorage.setItem('custom_search_results', JSON.stringify(updatedResults))
  }

  // Delete built-in page
  const deleteBuiltinPage = (pageKey) => {
    const updatedDeleted = [...deletedBuiltinPages, pageKey]
    setDeletedBuiltinPages(updatedDeleted)
    
    // Also remove any custom results for this page
    const updatedCustomResults = { ...customSearchResults }
    delete updatedCustomResults[pageKey]
    setCustomSearchResults(updatedCustomResults)
  }

  // Do not render a dedicated loading screen; allow the page shell to appear immediately.
  if (loading && !config) {
    return null
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="search-header relative">
        {/* Profile row - mobile only */}
        <div className="md:hidden flex justify-end px-4 pt-3 pb-2">
          {isAdmin ? (
            <div 
              className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center"
              title="Profile"
            >
              <span className="text-white text-base font-medium">E</span>
            </div>
          ) : (
            <div className="profile-menu-wrapper" onClick={() => setShowProfileMenu((open) => !open)}>
              <div className="profile-avatar">
                <div className="profile-avatar-inner">
                  <span className="profile-avatar-initial">E</span>
                </div>
              </div>
              {showProfileMenu && (
                <div className="profile-dropdown">
                  this feature is not available during the survey
                </div>
              )}
            </div>
          )}
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

          {/* Experimenter controls / profile icon - desktop only */}
          {isAdmin ? (
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              {/* Search Management Button */}
              <button
                className="border rounded px-2 py-1 text-sm whitespace-nowrap bg-purple-500 text-white"
                onClick={() => setShowSearchManagement(true)}
                title="Manage search results and AI overviews"
              >
                <span className="material-symbols-outlined align-middle mr-1">settings</span>
                Manage Search Results
              </button>
              <button
                className="border rounded px-2 py-1 text-sm whitespace-nowrap bg-blue-600 text-white"
                onClick={() => setShowNewPageEditor(true)}
                title="Create entirely new search pages"
              >
                <span className="material-symbols-outlined align-middle mr-1">add_circle</span>
                New Page
              </button>
              <button
                className="border rounded px-2 py-1 text-sm whitespace-nowrap"
                onClick={openPasteModal}
                title="Set AI Overview text"
              >
                <span className="material-symbols-outlined align-middle mr-1">edit</span>
                Set AI Text
              </button>
              <button
                className="border rounded px-2 py-1 text-sm whitespace-nowrap"
                onClick={() => setShowImageManager(true)}
                title="Manage images for search results"
              >
                <span className="material-symbols-outlined align-middle mr-1">image</span>
                Manage Images
              </button>
              <button
                className="border rounded px-2 py-1 text-sm whitespace-nowrap bg-orange-500 text-white"
                onClick={() => setShowClickTracker(true)}
                title="Click tracking admin panel"
              >
                <span className="material-symbols-outlined align-middle mr-1">analytics</span>
                Click Tracker
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-4 flex-shrink-0">
              <div className="profile-menu-wrapper" onClick={() => setShowProfileMenu((open) => !open)}>
                <div className="profile-avatar">
                  <div className="profile-avatar-inner">
                    <span className="profile-avatar-initial">E</span>
                  </div>
                </div>
                {showProfileMenu && (
                  <div className="profile-dropdown">
                    this feature is not available during the survey
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabs row */}
        <div className="px-4 md:pl-52 md:pr-6 mt-0 md:mt-2">
          <nav className="tabs flex gap-6 md:gap-8 text-sm overflow-x-auto">
            {['All','Images','Videos','Shopping','News','More'].map((tab) => (
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
            config={effectiveConfig} 
            onResultClick={handleResultClick}
            resultImages={resultImages}
            onImagesUpdate={handleImagesUpdate}
            selectedResultForImages={selectedResultForImages}
            onCloseImageEditor={() => setSelectedResultForImages(null)}
            userAIText={userAIText}
            aiOverviewEnabled={aiOverviewEnabled}
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
          setCustomSearchResults={setCustomSearchResults}
          searchResultAssignments={searchResultAssignments}
          aiOverviews={aiOverviews}
          onNavigate={(queryKey) => {
            setShowSearchManagement(false)
            navigateWithAdmin(`/search?q=${queryKey}&oq=${queryKey}&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8`)
          }}
          onAssignAI={assignAIOverviewToSearch}
          onRemoveAI={removeAIOverviewFromSearch}
          onDeletePage={removeCustomSearchPage}
          onDeleteBuiltinPage={deleteBuiltinPage}
          onEditResults={(searchType) => {
            setShowSearchManagement(false)
            setShowSearchResultsEditor(true)
          }}
          onReorderResults={reorderSearchResults}
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
                    <p style={{ margin: '0' }}>• Use curly braces {} to group images into scrollable rows</p>
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

      {/* Click Tracker Modal */}
      {showClickTracker && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={() => setShowClickTracker(false)}>
          <div style={{
            width: '90%',
            maxWidth: '600px',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f97316',
              color: 'white'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Click Tracking Admin</h2>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'white'
                }}
                onClick={() => setShowClickTracker(false)}
              >
                ✕
              </button>
            </div>

            <div style={{
              padding: '1rem',
              flex: 1,
              overflow: 'auto'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontSize: '14px', 
                  fontWeight: '500' 
                }}>
                  Current User ID for Tracking:
                </label>
                <input
                  type="text"
                  value={currentUserId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter user ID to track clicks..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <p style={{ 
                  margin: '0.5rem 0 0 0', 
                  fontSize: '12px', 
                  color: 'var(--muted)' 
                }}>
                  {currentUserId ? `Currently tracking clicks for: ${currentUserId}` : 'No user ID set - clicks will not be tracked'}
                </p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontSize: '14px', 
                  fontWeight: '500' 
                }}>
                  Download Click Logs:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="User ID to download logs for..."
                    id="downloadUserId"
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--card-bg)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => {
                      const userId = document.getElementById('downloadUserId').value
                      if (userId) downloadClickLogs(userId)
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Download CSV
                  </button>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Tracked Users ({Object.keys(clickLogs).length})
                </h3>
                {Object.keys(clickLogs).length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No click data recorded yet</p>
                ) : (
                  <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                    {Object.entries(clickLogs).map(([userId, logs]) => (
                      <div key={userId} style={{
                        padding: '0.5rem',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <strong>{userId}</strong>
                          <span style={{ color: 'var(--muted)', fontSize: '12px', marginLeft: '0.5rem' }}>
                            {logs.length} clicks
                          </span>
                        </div>
                        <button
                          onClick={() => downloadClickLogs(userId)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile menu - mobile only */}
      {showProfileMenu && (
        <div className="profile-menu md:hidden" onClick={() => setShowProfileMenu(false)}>
          <div className="profile-menu-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Settings</h3>
              <button 
                className="material-symbols-outlined icon-plain text-xl" 
                onClick={() => setShowProfileMenu(false)}
                aria-label="Close"
              >
                close
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <button
                  className="w-full border rounded px-3 py-2 text-sm bg-purple-600 text-white mb-2"
                  onClick={() => {
                    setShowProfileMenu(false)
                    setShowSearchManagement(true)
                  }}
                >
                  <span className="material-symbols-outlined align-middle mr-2 text-sm">settings</span>
                  Manage Search Results
                </button>
                
                <button
                  className="w-full border rounded px-3 py-2 text-sm bg-blue-600 text-white mb-2"
                  onClick={() => {
                    setShowProfileMenu(false)
                    setShowNewPageEditor(true)
                  }}
                >
                  <span className="material-symbols-outlined align-middle mr-2 text-sm">add_circle</span>
                  New Page
                </button>
              </div>
              
              <div>
                <button
                  className="w-full border rounded px-3 py-2 text-sm bg-blue-600 text-white mb-2"
                  onClick={() => {
                    setShowProfileMenu(false)
                    openPasteModal()
                  }}
                >
                  <span className="material-symbols-outlined align-middle mr-2 text-sm">edit</span>
                  Set AI Overview Text
                </button>
                
                <button
                  className="w-full border rounded px-3 py-2 text-sm"
                  onClick={() => {
                    setShowProfileMenu(false)
                    setShowImageManager(true)
                  }}
                >
                  <span className="material-symbols-outlined align-middle mr-2 text-sm">image</span>
                  Manage Images
                </button>
                
                <button
                  className="w-full border rounded px-3 py-2 text-sm"
                  onClick={() => {
                    setShowProfileMenu(false)
                    setShowClickTracker(true)
                  }}
                >
                  <span className="material-symbols-outlined align-middle mr-2 text-sm">analytics</span>
                  Click Tracking
                </button>
              </div>
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
    snippet: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.url.trim() || !formData.snippet.trim()) {
      alert('Please fill in all fields')
      return
    }

    if (editingResult) {
      onUpdateResult(editingResult.id, formData)
    } else {
      onAddResult(formData)
    }

    setFormData({ title: '', url: '', snippet: '' })
    setEditingResult(null)
  }

  const handleEdit = (result) => {
    setEditingResult(result)
    setFormData({
      title: result.title,
      url: result.url,
      snippet: result.snippet
    })
  }

  const handleCancel = () => {
    setFormData({ title: '', url: '', snippet: '' })
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
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
                  Snippet *
                </label>
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
                          if (e.target.src !== `https://www.google.com/s2/favicons?domain=example.com&sz=32`) {
                            e.target.src = `https://www.google.com/s2/favicons?domain=example.com&sz=32`
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
  setCustomSearchResults,
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

  // Seed built-in results into customSearchResults so they become editable
  useEffect(() => {
    if (!isOpen || Object.keys(builtinResults).length === 0) return

    const updatedCustomResults = { ...customSearchResults }
    let hasChanges = false

    Object.entries(builtinResults).forEach(([pageKey, results]) => {
      const existing = customSearchResults[pageKey]
      if (!existing || existing.length === 0) {
        const seeded = results.map((r, index) => ({
          id: `builtin-${pageKey}-${index}-${Date.now()}`,
          title: r.title,
          url: r.url,
          snippet: r.snippet,
          favicon: `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=32`,
          createdAt: new Date().toISOString(),
        }))
        updatedCustomResults[pageKey] = seeded
        hasChanges = true
      }
    })

    if (hasChanges) {
      setCustomSearchResults(updatedCustomResults)
    }
  }, [isOpen, builtinResults, customSearchResults, setCustomSearchResults])

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
                            {pageResults.length} custom results • {searchResultAssignments[page.key] ? 'AI assigned' : 'No AI assigned'}
                          </p>
                          {page.type === 'custom' && (
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                              URL: /search?q={page.queryKey}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onNavigate(page.queryKey)}
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
                          {searchResultAssignments[page.key] ? 'AI Overview assigned' : 'No AI Overview assigned'}
                        </p>
                      </div>
                      
                      {/* AI Overview Toggle Switch */}
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
                            checked={isPageAIOverviewEnabled ? isPageAIOverviewEnabled(page.key) : true}
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
                            backgroundColor: (isPageAIOverviewEnabled ? isPageAIOverviewEnabled(page.key) : true) ? '#007bff' : '#ccc',
                            transition: '0.3s',
                            borderRadius: '24px',
                            boxShadow: (isPageAIOverviewEnabled ? isPageAIOverviewEnabled(page.key) : true) ? '0 0 0 2px rgba(0, 123, 255, 0.25)' : 'none'
                          }}>
                            <span style={{
                              position: 'absolute',
                              content: '""',
                              height: '18px',
                              width: '18px',
                              left: (isPageAIOverviewEnabled ? isPageAIOverviewEnabled(page.key) : true) ? '23px' : '3px',
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
                          color: (isPageAIOverviewEnabled ? isPageAIOverviewEnabled(page.key) : true) ? '#007bff' : 'var(--muted)',
                          fontWeight: '500',
                          minWidth: '24px'
                        }}>
                          {(isPageAIOverviewEnabled ? isPageAIOverviewEnabled(page.key) : true) ? 'ON' : 'OFF'}
                        </span>
                      </div>
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
                        value={searchResultAssignments[page.key] || ''}
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
                      {searchResultAssignments[page.key] && (
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
}

// Page Results View Component
function PageResultsView({ page, pageResults, onBack, onEditResult, onAddResult, onDeleteResult, onReorderResults }) {
  console.log('PageResultsView DEBUG:')
  console.log('- page:', page)
  console.log('- page.key:', page?.key)
  console.log('- pageResults:', pageResults)
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
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', index.toString())
                e.currentTarget.style.opacity = '0.5'
              }}
              onDragEnd={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.style.borderColor = '#3b82f6'
                e.currentTarget.style.borderWidth = '2px'
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.borderWidth = '1px'
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.borderWidth = '1px'
                
                const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'))
                const targetIndex = index
                
                if (draggedIndex !== targetIndex && onReorderResults) {
                  onReorderResults(draggedIndex, targetIndex)
                }
              }}
              style={{
                padding: '1.5rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                backgroundColor: 'var(--card-bg)',
                transition: 'all 0.2s ease',
                cursor: 'grab',
                position: 'relative'
              }}
              onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
              onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
            >
              {/* Drag Handle */}
              <div style={{ 
                position: 'absolute', 
                left: '8px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
                fontSize: '16px',
                cursor: 'grab'
              }}>
                ⋮⋮
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginLeft: '20px' }}>
                <img 
                  src={result.favicon} 
                  alt="Favicon"
                  style={{ width: '20px', height: '20px', marginTop: '2px', flexShrink: 0, borderRadius: '50%', border: '1px solid var(--border)' }}
                  onError={(e) => {
                    if (e.target.src !== `https://www.google.com/s2/favicons?domain=example.com&sz=32`) {
                      e.target.src = `https://www.google.com/s2/favicons?domain=example.com&sz=32`
                    } else {
                      e.target.style.display = 'none'
                    }
                  }}
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
