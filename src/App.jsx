import React, { useEffect, useMemo, useState } from 'react'
import SimpleAIOverview from './components/SimpleAIOverview'
import SearchResult from './components/SearchResult'
import AdResult from './components/AdResult'
import ImageManager from './components/ImageManager'
import RichTextEditor from './components/RichTextEditor'
import SearchPage from './pages/SearchPage'
import UserAuth from './components/UserAuth'
// import SimpleSupabaseTest from './components/SimpleSupabaseTest'
import { ClickLogger } from './utils/logger'
import { loadConfigList, loadConfigByPath } from './utils/config'
import { supabase, signOut } from './utils/supabase'

const logger = new ClickLogger()

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [configIndex, setConfigIndex] = useState([])
  const [order, setOrder] = useState([])
  const [current, setCurrent] = useState(0)
  const [config, setConfig] = useState(null)
  const [randomize, setRandomize] = useState(true)
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
  const [modalView, setModalView] = useState('editor') // 'editor' or 'list'
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
      if (savedText) {
        setUserAIText(savedText)
      }
      
      // If authenticated, try to load from Supabase as well
      if (currentUser) {
        import('./utils/cloudData').then(({ loadCurrentAIText }) => {
          loadCurrentAIText().then(cloudText => {
            if (cloudText && cloudText !== savedText) {
              setUserAIText(cloudText)
              localStorage.setItem('ai_overview_text', cloudText)
            }
          })
        })
      }
    } catch {}
  }, [currentUser])

  useEffect(() => {
    (async () => {
      try {
        const list = await loadConfigList()
        setConfigIndex(list)
        setOrder((prev) => (randomize ? shuffle(list) : list))
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [])


  useEffect(() => {
    if (!order.length) return
    setLoading(true)
    loadConfigByPath(order[current]?.path)
      .then(setConfig)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [order, current])

  const handleLogin = (user) => {
    setCurrentUser(user)
    console.log('User logged in:', user.email)
  }

  const handleLogout = async () => {
    await signOut()
    setCurrentUser(null)
    setShowProfileMenu(false)
    console.log('User logged out')
  }

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session.user) {
        setCurrentUser(session.user)
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const query = config?.query ?? ''

  const handleResultClick = ({ query, url }) => {
    logger.log({ query, url })
    logClick('search_result', url)
  }

  const handleDownload = () => logger.downloadCSV()

  const handleSelectChange = async (e) => {
    const idx = Number(e.target.value)
    setCurrent(idx)
  }

  const startRandomized = () => {
    setOrder(shuffle(configIndex))
    setCurrent(0)
  }

  const startSequential = () => {
    setOrder(configIndex)
    setCurrent(0)
  }

  const next = () => setCurrent((c) => Math.min(c + 1, order.length - 1))
  const prev = () => setCurrent((c) => Math.max(c - 1, 0))

  const effectiveConfig = useMemo(() => {
    if (!config) return null
    if (!userAIText) return config
    return {
      ...config,
      aiOverview: { ...(config.aiOverview || {}), show: true, text: userAIText },
    }
  }, [config, userAIText])

  const handlePaste = (e) => {
    // Require authentication for AI Overview functionality
    if (!currentUser) {
      e.preventDefault()
      alert('Please sign in to use AI Overview features')
      setShowProfileMenu(true)
      return
    }
    
    const clipboard = e.clipboardData
    const html = clipboard?.getData('text/html') || ''
    const text = clipboard?.getData('text') || ''
    const content = html || text
    if (content) {
      e.preventDefault()
      setUserAIText(content)
      try { 
        localStorage.setItem('ai_overview_text', content)
        // Also save to Supabase if authenticated
        if (currentUser) {
          import('./utils/cloudData').then(({ saveCurrentAIText }) => {
            saveCurrentAIText(content)
          })
        }
      } catch {}
    }
  }

  const openPasteModal = () => {
    // Require authentication for AI Overview functionality
    if (!currentUser) {
      alert('Please sign in to use AI Overview features')
      setShowProfileMenu(true)
      return
    }
    
    // Determine which view to show
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
    // Require authentication for saving AI overviews
    if (!currentUser) {
      alert('Please sign in to save AI overviews')
      setShowProfileMenu(true)
      return
    }
    
    if (selectedAIOverviewId) {
      // Update existing AI overview
      updateAIOverview(selectedAIOverviewId, draftTitle.trim() || `AI Overview ${aiOverviews.length + 1}`, draftAIText)
    } else if (modalView === 'editor' && draftAIText !== userAIText) {
      // Create new AI overview if text is different and we're in editor mode
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
    
    // Remove empty arrays to keep localStorage clean
    if (images.length === 0) {
      delete newResultImages[resultUrl]
    }
    
    setResultImages(newResultImages)
    
    // Save to localStorage
    try {
      localStorage.setItem('result_images', JSON.stringify(newResultImages))
    } catch (error) {
      console.warn('Failed to save images to localStorage:', error)
    }
    
    // Also save to Supabase if authenticated
    if (currentUser) {
      import('./utils/cloudData').then(({ saveResultImages }) => {
        saveResultImages(newResultImages)
      })
    }
  }

  const openImageManager = (result) => {
    // Require authentication for image management
    if (!currentUser) {
      alert('Please sign in to manage images')
      setShowProfileMenu(true)
      return
    }
    
    setSelectedResultForImages(result)
    setShowImageManager(true)
  }

  const clearAllImages = () => {
    // Require authentication for clearing images
    if (!currentUser) {
      alert('Please sign in to manage images')
      setShowProfileMenu(true)
      return
    }
    
    setResultImages({})
    try {
      localStorage.removeItem('result_images')
    } catch (error) {
      console.warn('Failed to clear images from localStorage:', error)
    }
    
    // Also clear from Supabase if authenticated
    if (currentUser) {
      import('./utils/cloudData').then(({ saveResultImages }) => {
        saveResultImages({})
      })
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

  // Save AI Overview enabled setting to localStorage and Supabase
  useEffect(() => {
    try {
      localStorage.setItem('ai_overview_enabled', JSON.stringify(aiOverviewEnabled))
      
      // Also save to Supabase if authenticated
      if (currentUser) {
        import('./utils/cloudData').then(({ saveSetting }) => {
          saveSetting('ai_overview_enabled', aiOverviewEnabled)
        })
      }
    } catch (error) {
      console.warn('Failed to save AI Overview enabled setting:', error)
    }
  }, [aiOverviewEnabled, currentUser])

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
    // Require authentication for creating AI overviews
    if (!currentUser) {
      alert('Please sign in to create AI overviews')
      setShowProfileMenu(true)
      return null
    }
    
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
    // Require authentication for deleting AI overviews
    if (!currentUser) {
      alert('Please sign in to delete AI overviews')
      setShowProfileMenu(true)
      return
    }
    
    const updatedOverviews = aiOverviews.filter(overview => overview.id !== id)
    setAIOverviews(updatedOverviews)
    
    // If we deleted the currently selected overview, clear selection
    if (selectedAIOverviewId === id) {
      setSelectedAIOverviewId(null)
      setUserAIText('')
    }
  }

  const updateAIOverview = (id, title, text) => {
    // Require authentication for updating AI overviews
    if (!currentUser) {
      alert('Please sign in to update AI overviews')
      setShowProfileMenu(true)
      return
    }
    
    const updatedOverviews = aiOverviews.map(overview => 
      overview.id === id 
        ? { ...overview, title: title.trim(), text: text.trim() }
        : overview
    )
    setAIOverviews(updatedOverviews)
  }

  const ALLOWED_TAGS = new Set(['B','STRONG','I','EM','U','BR','P','UL','OL','LI','A'])
  const ALLOWED_ATTRS = { 'A': new Set(['href']) }
  const BLOCKED_TAGS = new Set(['IMG','SVG','BUTTON','IFRAME','SCRIPT','STYLE'])
  const sanitizeHTML = (html) => {
    if (!html) return ''
    
    // Create a temporary DOM element to parse HTML
    const temp = document.createElement('div')
    temp.innerHTML = html
    
    // Function to clean a node
    const cleanNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toUpperCase()
        
        // Block dangerous tags completely
        if (BLOCKED_TAGS.has(tagName)) {
          return ''
        }
        
        // Allow certain tags
        if (ALLOWED_TAGS.has(tagName)) {
          let result = `<${tagName.toLowerCase()}`
          
          // Add allowed attributes
          if (ALLOWED_ATTRS[tagName]) {
            for (const attr of node.attributes) {
              if (ALLOWED_ATTRS[tagName].has(attr.name.toUpperCase())) {
                result += ` ${attr.name}="${attr.value}"`
              }
            }
          }
          
          result += '>'
          
          // Process children
          for (const child of node.childNodes) {
            result += cleanNode(child)
          }
          
          result += `</${tagName.toLowerCase()}>`
          return result
        } else {
          // For disallowed tags, just return the text content
          let result = ''
          for (const child of node.childNodes) {
            result += cleanNode(child)
          }
          return result
        }
      }
      
      return ''
    }
    
    let result = ''
    for (const child of temp.childNodes) {
      result += cleanNode(child)
    }
    
    return result
  }


  return (
    <div className="min-h-screen">
      {/* Supabase Test Panel - Commented out to fix blank page */}
      {/* <SimpleSupabaseTest /> */}

      {/* Header */}
      <header className="search-header">
        {/* Profile row - mobile only */}
        <div className="md:hidden flex justify-end px-4 pt-3 pb-2">
          {currentUser ? (
            <div 
              className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer" 
              title="Profile"
              onClick={() => setShowProfileMenu(true)}
            >
              <span className="text-white text-base font-medium">
                {currentUser.username?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          ) : (
            <div 
              className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center cursor-pointer" 
              title="Sign in"
              onClick={() => setShowProfileMenu(true)}
            >
              <span className="text-white text-base font-medium">?</span>
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
                value={query}
                readOnly
                onPaste={handlePaste}
                placeholder={currentUser ? "Paste text here to set AI Overview" : "Sign in required to set AI Overview"}
                title={userAIText ? 'AI Overview text overridden by pasted content' : (currentUser ? 'Paste to override AI Overview' : 'Sign in required to use AI Overview features')}
                style={{
                  opacity: currentUser ? 1 : 0.7,
                  cursor: currentUser ? 'text' : 'not-allowed'
                }}
              />
              <div className="search-affordances">
                {/* Clear button (non-functional) */}
                <button className="material-symbols-outlined icon-plain" aria-label="Clear" title="Clear">close</button>
                <span className="separator" />
                {/* Search icon */}
                <button className="material-symbols-outlined icon-plain" aria-label="Search" title="Search">search</button>
              </div>
            </div>

            {/* Mobile search bar */}
            <div className="search-bar md:hidden flex">
              {/* Search icon on left for mobile */}
              <button className="material-symbols-outlined icon-plain mr-2" aria-label="Search" title="Search">search</button>
              <input
                className="flex-1 outline-none text-[16px]"
                value={query}
                readOnly
                onPaste={handlePaste}
                placeholder={currentUser ? "Paste text here to set AI Overview" : "Sign in required to set AI Overview"}
                title={userAIText ? 'AI Overview text overridden by pasted content' : (currentUser ? 'Paste to override AI Overview' : 'Sign in required to use AI Overview features')}
                style={{
                  opacity: currentUser ? 1 : 0.7,
                  cursor: currentUser ? 'text' : 'not-allowed'
                }}
              />
              <div className="search-affordances">
                {/* Clear button (non-functional) */}
                <button className="material-symbols-outlined icon-plain" aria-label="Clear" title="Clear">close</button>
                <span className="separator" />
                {/* Microphone icon for mobile */}
                <button className="material-symbols-outlined icon-plain" aria-label="Voice search" title="Voice search">mic</button>
              </div>
            </div>
          </div>

          {/* Experimenter controls - desktop only */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <select className="select-primary" value={current} onChange={handleSelectChange}>
              {order.map((item, idx) => (
                <option key={item.path} value={idx}>{item.label}</option>
              ))}
            </select>
            <button
              className={`${currentUser ? 'border' : 'border border-gray-300 opacity-50 cursor-not-allowed'} rounded px-2 py-1 text-sm whitespace-nowrap`}
              onClick={openPasteModal}
              title={currentUser ? "Set AI Overview text" : "Sign in required to set AI Overview"}
              disabled={!currentUser}
            >
              <span className="material-symbols-outlined align-middle mr-1">edit</span>
              Set AI Text
            </button>
            <button
              className={`${currentUser ? 'border' : 'border border-gray-300 opacity-50 cursor-not-allowed'} rounded px-2 py-1 text-sm whitespace-nowrap`}
              onClick={() => currentUser && openImageManager(null)}
              title={currentUser ? "Manage result images" : "Sign in required to manage images"}
              disabled={!currentUser}
            >
              <span className="material-symbols-outlined align-middle mr-1">image</span>
              Images
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
              {/* Authentication Section */}
              <div>
                <UserAuth 
                  currentUser={currentUser}
                  onLogin={handleLogin}
                  onLogout={handleLogout}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Query Selection</label>
                <select 
                  className="w-full border rounded px-3 py-2 text-sm" 
                  value={current} 
                  onChange={handleSelectChange}
                >
                  {order.map((item, idx) => (
                    <option key={item.path} value={idx}>{item.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <button
                  className={`${currentUser ? 'w-full border rounded px-3 py-2 text-sm bg-blue-600 text-white mb-2' : 'w-full border rounded px-3 py-2 text-sm bg-gray-400 text-white mb-2 cursor-not-allowed'}`}
                  onClick={() => {
                    if (!currentUser) {
                      setShowProfileMenu(false)
                      return
                    }
                    setShowProfileMenu(false)
                    openPasteModal()
                  }}
                  disabled={!currentUser}
                >
                  <span className="material-symbols-outlined align-middle mr-2 text-sm">edit</span>
                  Set AI Overview {currentUser ? 'Text' : '(Sign in required)'}
                </button>
                
                <button
                  className={`${currentUser ? 'w-full border rounded px-3 py-2 text-sm' : 'w-full border rounded px-3 py-2 text-sm opacity-50 cursor-not-allowed'}`}
                  onClick={() => {
                    if (!currentUser) {
                      setShowProfileMenu(false)
                      return
                    }
                    setShowProfileMenu(false)
                    setShowImageManager(true)
                  }}
                  disabled={!currentUser}
                >
                  <span className="material-symbols-outlined align-middle mr-2 text-sm">image</span>
                  Manage Images {currentUser ? '' : '(Sign in required)'}
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

      {/* Footer note */}
      <footer className="text-center text-xs text-gray-500 py-6">
        Mock SERP for research purposes. No Google assets used.
      </footer>
    </div>
  )
}
