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

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showPasteModal) {
      document.body.classList.add('modal-open')
      // Fallback in case class is overridden
      document.body.style.overflow = 'hidden'
    } else {
      document.body.classList.remove('modal-open')
      document.body.style.overflow = ''
    }
    return () => {
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
        {/* Top row: search bar + controls */}
        <div className="pl-4 md:pl-48 pr-4 md:pr-6 pt-6 pb-2 md:pb-3 flex items-center gap-4 relative">
          {/* Profile icon - mobile only */}
          <button className="md:hidden absolute top-2 right-4 material-symbols-outlined icon-plain text-2xl" aria-label="Profile" title="Profile">
            account_circle
          </button>

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
            <div className="search-bar flex md:hidden">
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

          {/* Experimenter controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
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
              <span className="hidden sm:inline">Set AI Text</span>
              <span className="sm:hidden">AI</span>
            </button>
          </div>
        </div>

        {/* Tabs row */}
        <div className="pl-4 md:pl-52 pr-4 md:pr-6 mt-2">
          <nav className="tabs flex gap-3 md:gap-6 text-sm overflow-x-auto">
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
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal mx-4">
            <div className="modal-header">
              <h3 className="text-base font-medium">Set AI Overview Text</h3>
              <button className="material-symbols-outlined icon-plain" onClick={() => setShowPasteModal(false)} aria-label="Close">close</button>
            </div>
            <div className="modal-body">
              <div
                className="rich-input"
                contentEditable
                role="textbox"
                aria-multiline="true"
                placeholder="Paste or type text here..."
                onInput={(e) => setDraftAIText(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: draftAIText || '' }}
              />
            </div>
            <div className="modal-footer">
              <button className="border rounded px-3 py-1" onClick={clearAIOverview}>Clear</button>
              <button className="border rounded px-3 py-1" onClick={() => setShowPasteModal(false)}>Cancel</button>
              <button className="border rounded px-3 py-1 bg-blue-600 text-white" onClick={savePasteModal}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="pl-4 md:pl-52 pr-4 md:pr-6 py-3 md:py-6">
        {loading && <div>Loading…</div>}
        {error && <div className="text-red-600">{error}</div>}
        {!loading && !error && effectiveConfig && (
          <SearchPage config={effectiveConfig} onResultClick={handleResultClick} />
        )}
      </main>

      {/* Footer note */}
      <footer className="text-center text-xs text-gray-500 py-6">
        Mock SERP for research purposes. No Google assets used.
      </footer>
    </div>
  )
}
