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
    const text = e.clipboardData?.getData('text') || ''
    if (text) {
      e.preventDefault()
      setUserAIText(text)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="search-header">
        {/* Top row: search bar + controls */}
        <div className="pl-48 pr-6 pt-6 pb-3 flex items-center gap-4">
          <div className="flex-1">
            <div className="search-bar">
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
          </div>

          {/* Experimenter controls */}
          <div className="flex items-center gap-2">
            <select className="select-primary" value={current} onChange={handleSelectChange}>
              {order.map((item, idx) => (
                <option key={item.path} value={idx}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs row */}
        <div className="pl-52 pr-6 mt-2">
          <nav className="tabs flex gap-6 text-sm">
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
      <main className="pl-52 pr-6 py-6">
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
