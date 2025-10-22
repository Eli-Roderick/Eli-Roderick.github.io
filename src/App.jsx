import React, { useEffect, useMemo, useState } from 'react'
import SearchPage from './pages/SearchPage'
import { loadConfigList, loadConfigByPath } from './utils/configLoader'
import { ClickLogger } from './utils/logger'

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

  // Prevent background scroll when modal is open and handle escape key
  useEffect(() => {
    if (showPasteModal) {
      document.body.classList.add('modal-open')
      document.body.style.overflow = 'hidden'
      
      // Add escape key handler
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          setShowPasteModal(false)
        }
      }
      document.addEventListener('keydown', handleEscape)
      
      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.classList.remove('modal-open')
        document.body.style.overflow = ''
      }
    } else {
      document.body.classList.remove('modal-open')
      document.body.style.overflow = ''
    }
  }, [showPasteModal])

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

  // Load persisted AI text on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai_overview_text')
      if (saved) setUserAIText(saved)
    } catch {}
  }, [])

  useEffect(() => {
    if (!order.length) return
    setLoading(true)
    loadConfigByPath(order[current]?.path)
      .then(setConfig)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [order, current])

  const query = config?.query ?? ''

  const handleResultClick = ({ query, url }) => {
    logger.log({ query, url })
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
      if (selectedAIOverviewId) {
        // Update existing AI overview
        updateAIOverview(selectedAIOverviewId, draftTitle.trim() || `AI Overview ${aiOverviews.length + 1}`, draftAIText)
      } else if (modalView === 'editor' && draftAIText !== userAIText) {
        // Create new AI overview if text is different and we're in editor mode
        const newId = createAIOverview(draftTitle.trim() || `AI Overview ${aiOverviews.length + 1}`, draftAIText)
        setSelectedAIOverviewId(newId)
      }
      setUserAIText(draftAIText)
    }
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
    
    // If we deleted the currently selected overview, clear selection
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

  const ALLOWED_TAGS = new Set(['B','STRONG','I','EM','U','BR','P','UL','OL','LI','A'])
  const ALLOWED_ATTRS = { 'A': new Set(['href']) }
  const BLOCKED_TAGS = new Set(['IMG','SVG','BUTTON','IFRAME','SCRIPT','STYLE'])
  const sanitizeHTML = (html) => {
    // DO NOT DELETE ANYTHING - JUST RETURN THE CONTENT AS-IS
    return html || ''
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
                placeholder="Paste text here to set AI Overview"
                title={userAIText ? 'AI Overview text overridden by pasted content' : 'Paste to override AI Overview'}
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
                  <div
                    className="ai-text-editor"
                    contentEditable
                    suppressContentEditableWarning={true}
                    onInput={(e) => setDraftAIText(e.target.innerHTML)}
                    dangerouslySetInnerHTML={{ __html: draftAIText }}
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

      {/* Image Manager Modal */}
      {showImageManager && (
        <div style={{
          position: 'fixed',
          top: '0px',
          left: '0px',
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999999,
          pointerEvents: 'all'
        }} onClick={() => setShowImageManager(false)}>
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
            maxHeight: '80vh',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ 
              padding: '1rem', 
              borderBottom: '1px solid var(--border)', 
              backgroundColor: 'var(--card-bg)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, color: 'var(--text)', fontSize: '18px', fontWeight: '600' }}>Manage Images</h2>
              <button 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '20px', 
                  cursor: 'pointer',
                  color: 'var(--muted)'
                }} 
                onClick={() => setShowImageManager(false)}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'var(--card-bg)',
              maxHeight: '60vh',
              overflow: 'auto'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>
                  Select a search result to add or edit images:
                </p>
                {Object.keys(resultImages).length > 0 && (
                  <button
                    onClick={clearAllImages}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      border: '1px solid #dc3545',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      color: '#dc3545',
                      cursor: 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              {effectiveConfig?.results?.slice(0, 10).map((result, idx) => (
                !result.ad && (
                  <div 
                    key={idx}
                    style={{
                      padding: '12px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      backgroundColor: 'var(--card-bg)',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => openImageEditorForResult(result)}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--border-subtle)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--card-bg)'}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ 
                          margin: '0 0 4px 0', 
                          color: 'var(--text)', 
                          fontSize: '14px',
                          fontWeight: '500',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {result.title}
                        </h4>
                        <p style={{ 
                          margin: '0', 
                          color: 'var(--muted)', 
                          fontSize: '12px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {result.url.replace(/^https?:\/\//, '')}
                        </p>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexShrink: 0
                      }}>
                        {resultImages[result.url]?.length > 0 && (
                          <span style={{
                            backgroundColor: '#007bff',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}>
                            {resultImages[result.url].length} image{resultImages[result.url].length !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span style={{ color: 'var(--muted)', fontSize: '12px' }}>→</span>
                      </div>
                    </div>
                  </div>
                )
              ))}
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
