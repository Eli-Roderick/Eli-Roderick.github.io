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
  const [resultImages, setResultImages] = useState({})

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
    if (html || text) {
      e.preventDefault()
      const content = html ? sanitizeHTML(html) : (text.replace(/\n/g, '<br>'))
      setUserAIText(content)
      try { localStorage.setItem('ai_overview_text', content) } catch {}
    }
  }

  const openPasteModal = () => {
    setDraftAIText(userAIText)
    setShowPasteModal(true)
  }

  const handleImagesUpdate = (resultUrl, images) => {
    setResultImages(prev => ({
      ...prev,
      [resultUrl]: images
    }))
  }

  const openImageEditorForResult = (result) => {
    setSelectedResultForImages(result)
    setShowImageManager(false)
  }

  const ALLOWED_TAGS = new Set(['B','STRONG','I','EM','U','BR','P','UL','OL','LI','A'])
  const ALLOWED_ATTRS = { 'A': new Set(['href']) }
  const sanitizeHTML = (html) => {
    try {
      const container = document.createElement('div')
      container.innerHTML = html || ''

      // Convert styled spans to semantic tags before filtering
      container.querySelectorAll('span').forEach((el) => {
        const fw = (el.style && el.style.fontWeight) || ''
        const fs = (el.style && el.style.fontStyle) || ''
        let replacement = null
        if (fw && (fw === 'bold' || parseInt(fw, 10) >= 600)) {
          replacement = document.createElement('strong')
        } else if (fs && fs === 'italic') {
          replacement = document.createElement('em')
        }
        if (replacement) {
          replacement.innerHTML = el.innerHTML
          el.replaceWith(replacement)
        }
      })
      const walk = (node) => {
        const children = Array.from(node.childNodes)
        for (const child of children) {
          if (child.nodeType === 1) { // ELEMENT_NODE
            const tag = child.tagName
            if (!ALLOWED_TAGS.has(tag)) {
              // Replace disallowed element with its text content/children
              const fragment = document.createDocumentFragment()
              while (child.firstChild) fragment.appendChild(child.firstChild)
              node.replaceChild(fragment, child)
              continue
            }
            // strip attributes except allowed ones
            const allowed = ALLOWED_ATTRS[tag] || new Set()
            Array.from(child.attributes).forEach(attr => {
              if (!allowed.has(attr.name.toLowerCase())) child.removeAttribute(attr.name)
            })
            walk(child)
          } else if (child.nodeType === 8) { // COMMENT_NODE
            node.removeChild(child)
          }
        }
      }
      walk(container)
      return container.innerHTML
    } catch {
      return (html || '').toString()
    }
  }

  const savePasteModal = () => {
    const cleaned = sanitizeHTML(draftAIText)
    setUserAIText(cleaned)
    try { localStorage.setItem('ai_overview_text', cleaned) } catch {}
    setShowPasteModal(false)
  }

  const clearAIOverview = () => {
    setUserAIText('')
    try { localStorage.removeItem('ai_overview_text') } catch {}
    setShowPasteModal(false)
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

      {/* Paste modal */}
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
        }} onClick={() => setShowPasteModal(false)}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '500px',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            zIndex: 1000000,
            pointerEvents: 'all',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
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
              <h2 style={{ margin: 0, color: 'var(--text)', fontSize: '18px', fontWeight: '600' }}>Set AI Overview Text</h2>
              <button 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '20px', 
                  cursor: 'pointer',
                  color: 'var(--muted)'
                }} 
                onClick={() => setShowPasteModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1rem', backgroundColor: 'var(--card-bg)' }}>
              <div style={{ marginBottom: '1rem', color: 'var(--muted)', fontSize: '14px' }}>
                <p style={{ margin: '0 0 8px 0' }}><strong>Tip:</strong> You can include images by pasting image URLs (jpg, png, gif, webp, svg, bmp).</p>
                <p style={{ margin: '0 0 4px 0' }}><strong>Examples:</strong></p>
                <p style={{ margin: '0 0 4px 0' }}>• Single image: [https://example.com/image.jpg]</p>
                <p style={{ margin: '0 0 4px 0' }}>• Horizontal row: {'{[image1.jpg][image2.jpg][image3.jpg]}'}</p>
                <p style={{ margin: '0' }}>• Use curly braces {} to group images into scrollable rows</p>
              </div>
              <div
                style={{
                  width: '100%',
                  minHeight: '200px',
                  maxHeight: '300px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '12px',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                  overflow: 'auto',
                  outline: 'none'
                }}
                contentEditable
                suppressContentEditableWarning={true}
                onInput={(e) => setDraftAIText(e.target.innerHTML)}
                dangerouslySetInnerHTML={{ __html: draftAIText }}
              />
            </div>

            {/* Footer */}
            <div style={{ 
              padding: '1rem', 
              borderTop: '1px solid var(--border)', 
              backgroundColor: 'var(--card-bg)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px'
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
              <p style={{ margin: '0 0 1rem 0', color: 'var(--muted)', fontSize: '14px' }}>
                Select a search result to add or edit images:
              </p>
              
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
