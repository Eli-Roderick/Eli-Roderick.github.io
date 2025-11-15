import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import SimpleAIOverview from '../components/SimpleAIOverview'
import SearchResult from '../components/SearchResult'
import AdResult from '../components/AdResult'
import ImageManager from '../components/ImageManager'
import RichTextEditor from '../components/RichTextEditor'
import SearchPage from './SearchPage'
import { ClickLogger } from '../utils/logger'
import { loadConfigByPath } from '../utils/config'

const logger = new ClickLogger()

// URL slug to config path mapping
const configMapping = {
  'hiking-boots': '/configs/query1.json',
  'breakfast-ideas': '/configs/query2.json', 
  'electric-cars': '/configs/query3.json'
}

// URL slug to display name mapping
const displayNames = {
  'hiking-boots': 'Best hiking boots',
  'breakfast-ideas': 'Healthy breakfast ideas',
  'electric-cars': 'Electric cars 2025'
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
  const { searchType } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
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
  const [selectedAIOverviewId, setSelectedAIOverviewId] = useState(() => {
    try {
      const saved = localStorage.getItem('selected_ai_overview_id')
      return saved || null
    } catch {
      return null
    }
  })
  const [searchResultAssignments, setSearchResultAssignments] = useState(() => {
    try {
      const saved = localStorage.getItem('search_result_assignments')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })
  const [showSearchManagement, setShowSearchManagement] = useState(false)
  const [aiOverviewEnabled, setAIOverviewEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_overview_enabled')
      return saved !== null ? JSON.parse(saved) : true
    } catch {
      return true
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

  // Load config based on URL parameter
  useEffect(() => {
    const configPath = configMapping[searchType]
    if (!configPath) {
      setError('Search type not found')
      setLoading(false)
      return
    }

    setLoading(true)
    loadConfigByPath(configPath)
      .then(setConfig)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [searchType])

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
      } else {
        // No assignment, clear AI overview
        setSelectedAIOverviewId(null)
        setUserAIText('')
      }
    }
  }, [searchType, aiOverviews, searchResultAssignments])

  const query = config?.query ?? displayNames[searchType] ?? ''

  const handleResultClick = ({ query, url }) => {
    logger.log({ query, url })
    logClick('search_result', url)
  }

  const handleDownload = () => logger.downloadCSV()

  const effectiveConfig = useMemo(() => {
    if (!config) return null
    if (!userAIText) return config
    return {
      ...config,
      aiOverview: { ...(config.aiOverview || {}), show: true, text: userAIText },
    }
  }, [config, userAIText])

  const handlePaste = (e) => {
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

  // Save selected AI overview ID to localStorage whenever it changes
  useEffect(() => {
    try {
      if (selectedAIOverviewId) {
        localStorage.setItem('selected_ai_overview_id', selectedAIOverviewId)
      } else {
        localStorage.removeItem('selected_ai_overview_id')
      }
    } catch (error) {
      console.warn('Failed to save selected AI overview ID to localStorage:', error)
    }
  }, [selectedAIOverviewId])

  // Save AI overview enabled state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('ai_overview_enabled', JSON.stringify(aiOverviewEnabled))
    } catch (error) {
      console.warn('Failed to save AI overview enabled state to localStorage:', error)
    }
  }, [aiOverviewEnabled])

  // Save search result assignments to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('search_result_assignments', JSON.stringify(searchResultAssignments))
    } catch (error) {
      console.warn('Failed to save search result assignments to localStorage:', error)
    }
  }, [searchResultAssignments])

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
    setSelectedAIOverviewId(newOverview.id)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading search results...</p>
        </div>
      </div>
    )
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

  if (!configMapping[searchType]) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Search type "{searchType}" not found</p>
          <button 
            onClick={() => navigate('/search/hiking-boots')} 
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
      <header className="search-header">
        {/* Profile row - mobile only */}
        <div className="md:hidden flex justify-end px-4 pt-3 pb-2">
          <div 
            className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer" 
            title="Profile"
            onClick={() => setShowProfileMenu(true)}
          >
            <span className="text-white text-base font-medium">E</span>
          </div>
        </div>
        
        {/* Top row: search bar + controls */}
        <div className="px-4 md:pl-48 md:pr-6 pt-2 md:pt-6 pb-1 md:pb-3 flex items-center gap-2 md:gap-4">

          <div className="flex-1">
            {/* Desktop search bar */}
            <div className="search-bar hidden md:flex">
              <input
                className="flex-1 outline-none text-[16px]"
                value={query}
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
                value={query}
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

          {/* Experimenter controls - desktop only */}
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
        {loading && <div>Loading…</div>}
        {error && <div className="text-red-600">{error}</div>}
        {!loading && !error && effectiveConfig && (
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

      {/* Search Management Modal */}
      {showSearchManagement && (
        <div style={{
          position: 'fixed',
          top: '0px',
          left: '0px',
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999999,
          pointerEvents: 'all'
        }} onClick={() => setShowSearchManagement(false)}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '800px',
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
              backgroundColor: '#8b5cf6',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                Manage Search Results & AI Overviews
              </h2>
              <button 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '20px', 
                  cursor: 'pointer',
                  color: 'white'
                }} 
                onClick={() => setShowSearchManagement(false)}
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
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                  Search Result Types
                </h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '14px', color: 'var(--muted)' }}>
                  Assign AI overviews to search result types. When someone visits a search result, it will automatically show the assigned AI overview.
                </p>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {Object.entries(displayNames).map(([key, name]) => (
                    <div key={key} style={{
                      padding: '1rem',
                      border: `2px solid ${searchType === key ? '#8b5cf6' : 'var(--border)'}`,
                      borderRadius: '8px',
                      backgroundColor: searchType === key ? 'color-mix(in hsl, #8b5cf6, transparent 95%)' : 'var(--card-bg)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                            {name}
                            {searchType === key && <span style={{ color: '#8b5cf6', marginLeft: '0.5rem' }}>(Current)</span>}
                          </h4>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                            URL: /search/{key}
                          </p>
                        </div>
                        <button
                          style={{
                            padding: '6px 12px',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          onClick={() => {
                            setShowSearchManagement(false)
                            navigate(`/search/${key}`)
                          }}
                        >
                          View
                        </button>
                      </div>
                      
                      <div style={{ marginTop: '0.75rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
                          Assigned AI Overview:
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <select
                            style={{
                              flex: 1,
                              padding: '0.5rem',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                              backgroundColor: 'var(--card-bg)',
                              color: 'var(--text)',
                              fontSize: '14px'
                            }}
                            value={searchResultAssignments[key] || ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                assignAIOverviewToSearch(key, e.target.value)
                              } else {
                                removeAIOverviewFromSearch(key)
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
                          {searchResultAssignments[key] && (
                            <button
                              style={{
                                padding: '0.5rem',
                                border: '1px solid #dc3545',
                                borderRadius: '4px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                              onClick={() => removeAIOverviewFromSearch(key)}
                              title="Remove assignment"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
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
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontSize: '14px',
                      cursor: 'pointer',
                      marginBottom: '1rem'
                    }}
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
                              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                                {new Date(overview.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
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
