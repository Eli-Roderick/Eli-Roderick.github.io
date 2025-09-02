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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="search-header">
        {/* Top row: search bar + controls */}
        <div className="pl-32 pr-4 py-3 flex items-center gap-4">
          <div className="flex-1">
            <div className="search-bar">
              <input className="flex-1 outline-none text-[16px]" value={query} readOnly />
            </div>
          </div>

          {/* Experimenter controls */}
          <div className="flex items-center gap-2">
            <select className="border rounded px-2 py-1" value={current} onChange={handleSelectChange}>
              {order.map((item, idx) => (
                <option key={item.path} value={idx}>{item.label}</option>
              ))}
            </select>
            <button className="border rounded px-2 py-1" onClick={prev} disabled={current===0}>Prev</button>
            <button className="border rounded px-2 py-1" onClick={next} disabled={current===order.length-1}>Next</button>
            <button className="border rounded px-2 py-1" onClick={startRandomized}>Randomize</button>
            <button className="border rounded px-2 py-1" onClick={startSequential}>Sequential</button>
            <button className="border rounded px-2 py-1" onClick={handleDownload}>Download CSV ({logger.getCount()})</button>
          </div>
        </div>

        {/* Tabs row */}
        <div className="pl-32 pr-4">
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
      <main className="pl-32 pr-4 py-4">
        {loading && <div>Loading…</div>}
        {error && <div className="text-red-600">{error}</div>}
        {!loading && !error && config && (
          <SearchPage config={config} onResultClick={handleResultClick} />
        )}
      </main>

      {/* Footer note */}
      <footer className="text-center text-xs text-gray-500 py-6">
        Mock SERP for research purposes. No Google assets used.
      </footer>
    </div>
  )
}
