import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import UserAuth from '../components/UserAuth'
import RichTextEditor from '../components/RichTextEditor'
import useRealtimeData from '../hooks/useRealtimeData'
import { loadConfigByPath } from '../utils/config'
import { getCurrentUser, supabase } from '../utils/supabase'
import { getAnyActiveSession, createSession, endSession } from '../utils/cloudDataV2'

// Query to config path mapping (same as SearchResultsPage)
const queryToConfig = {
  'best hiking boots': { path: '/configs/query1.json', key: 'hiking-boots' },
  'best+hiking+boots': { path: '/configs/query1.json', key: 'hiking-boots' }
}

// Display name mapping for built-in pages
const displayNames = {
  'hiking-boots': 'Best hiking boots'
}

export default function HomePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // User state - use cached user immediately, verify in background
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return localStorage.getItem('current_user') || null
    } catch {
      return null
    }
  })
  const [authChecked, setAuthChecked] = useState(!!currentUser)
  
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
  
  // Use realtime data hook for Supabase data
  const {
    pages,
    resultsByPage,
    aiOverviews,
    aiAssignments,
    participants,
    loading,
    addPage,
    editPage,
    removePage,
    addAIOverview,
    editAIOverview,
    removeAIOverview,
    assignAI,
    unassignAI,
    addParticipant,
    editParticipant,
    removeParticipant
  } = useRealtimeData(currentUser)
  
  // UI state - read initial tab from URL query param
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab')
    return tabParam && ['pages', 'ai', 'participants'].includes(tabParam) ? tabParam : 'pages'
  })
  const [selectedPageForResults, setSelectedPageForResults] = useState(null)
  const [builtinResults, setBuiltinResults] = useState({})
  const [pageSearchQuery, setPageSearchQuery] = useState('')
  const [editingPageName, setEditingPageName] = useState(null)
  const [editingDisplayName, setEditingDisplayName] = useState('')
  const [showNewPageModal, setShowNewPageModal] = useState(false)
  const [newPageFormData, setNewPageFormData] = useState({ query: '', displayName: '' })
  
  // Participant state
  const [showParticipantModal, setShowParticipantModal] = useState(false)
  const [newParticipantName, setNewParticipantName] = useState('')
  const [activeSession, setActiveSession] = useState(null) // The one active session across all participants
  const [sessionLoading, setSessionLoading] = useState(false)
  
  // Load active session on mount and when participants change
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
  }, [currentUser, participants])

  // Subscribe to realtime session updates
  useEffect(() => {
    if (!currentUser) return

    const channel = supabase
      .channel('sessions_home')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.status === 'active') {
            setActiveSession(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            // Session ended or status changed
            if (payload.new.status !== 'active' && activeSession?.id === payload.new.id) {
              setActiveSession(null)
            } else if (payload.new.status === 'active') {
              setActiveSession(payload.new)
            }
          } else if (payload.eventType === 'DELETE' && activeSession?.id === payload.old.id) {
            setActiveSession(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser, activeSession])

  const handleStartSession = async (participantId) => {
    setSessionLoading(true)
    const session = await createSession(participantId)
    if (session) {
      setActiveSession(session)
    }
    setSessionLoading(false)
  }

  const handleEndSession = async () => {
    if (!activeSession) return
    setSessionLoading(true)
    await endSession(activeSession.id)
    setActiveSession(null)
    setSessionLoading(false)
  }
  
  // AI Overview Manager state
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiModalView, setAIModalView] = useState('list') // 'list' or 'editor'
  const [editingAIOverview, setEditingAIOverview] = useState(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftAIText, setDraftAIText] = useState('')

  // User login/logout handlers
  const handleUserLogin = (username) => {
    setCurrentUser(username)
    try {
      localStorage.setItem('current_user', username)
    } catch (error) {
      console.warn('Failed to save user to localStorage:', error)
    }
  }

  const handleUserLogout = async () => {
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
  }

  // Combine built-in and custom pages from realtime data
  const allPages = useMemo(() => {
    // Built-in pages
    const builtinPages = Object.entries(displayNames).map(([key, name]) => ({
      id: `builtin-${key}`,
      key,
      name,
      type: 'built-in',
      queryKey: Object.keys(queryToConfig).find(q => queryToConfig[q].key === key),
      customResultCount: (resultsByPage[`builtin-${key}`] || []).length
    }))
    
    // Custom pages from Supabase
    const customPages = pages.map(page => ({
      id: page.id,
      key: page.search_key || page.query?.toLowerCase().replace(/\s+/g, '-'),
      name: page.display_name,
      type: 'custom',
      queryKey: page.query,
      customResultCount: (resultsByPage[page.id] || []).length
    }))
    
    return [...builtinPages, ...customPages]
  }, [pages, resultsByPage])

  // Load built-in results
  useEffect(() => {
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

    if (currentUser) {
      loadBuiltinResults()
    }
  }, [currentUser, allPages])

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
      // Update display name logic here
    }
    setEditingPageName(null)
    setEditingDisplayName('')
  }

  const cancelPageNameEdit = () => {
    setEditingPageName(null)
    setEditingDisplayName('')
  }


  // AI Overview Modal functions
  const openAIModal = () => {
    setAIModalView('editor')
    setDraftTitle('')
    setDraftAIText('')
    setEditingAIOverview(null)
    setShowAIModal(true)
  }

  const handleCreateNew = () => {
    setAIModalView('editor')
    setDraftTitle('')
    setDraftAIText('')
    setEditingAIOverview(null)
  }

  const handleSelectFromList = (overview) => {
    setAIModalView('editor')
    setDraftTitle(overview.title)
    setDraftAIText(overview.content || overview.text || '')
    setEditingAIOverview(overview)
  }

  const handleBackToList = () => {
    setAIModalView('list')
  }

  const saveAIOverview = async () => {
    if (!draftTitle.trim()) {
      alert('Please enter a title')
      return
    }

    if (editingAIOverview) {
      // Update existing - use 'content' field for Supabase
      await editAIOverview(editingAIOverview.id, {
        title: draftTitle.trim(),
        content: draftAIText
      })
    } else {
      // Create new
      await addAIOverview({
        title: draftTitle.trim() || `AI Overview ${aiOverviews.length + 1}`,
        content: draftAIText
      })
    }
    
    setShowAIModal(false)
    setEditingAIOverview(null)
    setDraftTitle('')
    setDraftAIText('')
  }

  const clearAIOverview = () => {
    setDraftTitle('')
    setDraftAIText('')
  }

  const handleDeleteAIOverview = async (id) => {
    if (!confirm('Are you sure you want to delete this AI Overview? This action cannot be undone.')) return
    
    await removeAIOverview(id)
    
    // If we were editing this one, go back to list
    if (editingAIOverview && editingAIOverview.id === id) {
      setAIModalView('list')
      setEditingAIOverview(null)
    }
  }

  const closeAIModal = () => {
    setShowAIModal(false)
    setEditingAIOverview(null)
    setDraftTitle('')
    setDraftAIText('')
  }

  const TABS = [
    { id: 'pages', label: 'Pages', icon: 'description' },
    { id: 'ai-manager', label: 'AI Overview Manager', icon: 'auto_awesome' },
    { id: 'participants', label: 'Study Participants', icon: 'group' }
  ]

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)' }}>
        <p style={{ color: 'var(--muted)' }}>Loading...</p>
      </div>
    )
  }

  // Show login if no user
  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)' }}>
        <UserAuth 
          currentUser={currentUser}
          onLogin={handleUserLogin}
          onLogout={handleUserLogout}
        />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      {/* Breadcrumb Bar */}
      <div style={{ 
        padding: '0.75rem 2rem', 
        backgroundColor: 'var(--card-bg)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px' }}>
          <span style={{ color: 'var(--text)', fontWeight: '500' }}>Home</span>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {activeSession && (
            <button
              onClick={() => navigate(`/participant/${activeSession.participant_id}/sessions?expand=${activeSession.id}`)}
              style={{
                backgroundColor: '#22c55e',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <span style={{ 
                width: '6px', 
                height: '6px', 
                backgroundColor: 'white', 
                borderRadius: '50%'
              }} />
              Session Active
            </button>
          )}
          <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
            {currentUser}
          </span>
          <button
            onClick={handleUserLogout}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--text)'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Header */}
      <div style={{ 
        padding: '1.5rem 2rem', 
        backgroundColor: 'var(--card-bg)',
        borderBottom: '2px solid var(--border)'
      }}>
        <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '28px', fontWeight: '700', color: 'var(--text)' }}>
          Search Management
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
          Manage pages, results, and AI overviews
        </p>
      </div>

      {/* Tabs */}
      <div style={{ 
        padding: '0.75rem 2rem',
        backgroundColor: 'var(--card-bg)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: '0.75rem'
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.625rem 1.25rem',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: activeTab === tab.id ? 'var(--tab-active)' : 'var(--border)',
              color: activeTab === tab.id ? 'white' : 'var(--text)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ padding: '2rem', paddingTop: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
        {activeTab === 'pages' && !selectedPageForResults && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--muted)' }}>description</span>
                All Search Pages
              </h2>
              <button
                onClick={() => setShowNewPageModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--tab-active)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                Add Page
              </button>
            </div>
            
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
                const pageResults = resultsByPage[page.id] || []
                return (
                  <div key={page.key} style={{
                    padding: '1.5rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card-bg)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>
                            {page.name}
                          </h3>
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
                          {pageResults.length} custom results • {aiAssignments[page.id] ? 'AI assigned' : 'No AI assigned'}
                        </p>
                        {page.type === 'custom' && (
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>URL: /session?q={page.queryKey}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const fullUrl = `https://eli-roderick.github.io/session?q=${encodeURIComponent(page.queryKey)}`
                                const icon = e.currentTarget.querySelector('span')
                                navigator.clipboard.writeText(fullUrl)
                                  .then(() => {
                                    icon.textContent = 'check'
                                    setTimeout(() => { icon.textContent = 'content_copy' }, 1500)
                                  })
                                  .catch(() => alert('Failed to copy'))
                              }}
                              style={{
                                padding: '0.125rem',
                                border: 'none',
                                borderRadius: '3px',
                                backgroundColor: 'transparent',
                                color: 'var(--muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Copy URL"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span>
                            </button>
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button
                          onClick={() => {
                            const query = page.type === 'custom' ? page.queryKey : page.queryKey?.replace(/\s+/g, '+')
                            navigate(`/search?q=${encodeURIComponent(query || '')}&preview=true`)
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--card-bg)',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                          Preview
                        </button>
                        <button
                          onClick={() => navigate(`/page/${page.id}`)}
                          style={{
                            padding: '0.5rem 1rem',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: '#16a34a',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Manage
                        </button>
                        {page.type === 'custom' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm(`Delete "${page.name}"? This will also delete all associated results.`)) {
                                removePage(page.id)
                              }
                            }}
                            style={{
                              padding: '0.5rem',
                              border: 'none',
                              borderRadius: '4px',
                              backgroundColor: 'transparent',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Delete page"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        {activeTab === 'ai-manager' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--muted)' }}>auto_awesome</span>
                AI Overview Manager
              </h2>
              <button
                onClick={openAIModal}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'var(--tab-active)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                + Create New AI Overview
              </button>
            </div>
            
            {/* AI Overviews List */}
            {aiOverviews.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem', 
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--muted)'
              }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '16px' }}>No AI overviews created yet.</p>
                <p style={{ margin: 0, fontSize: '14px' }}>Click the button above to create your first one!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {aiOverviews.map(overview => (
                  <div 
                    key={overview.id} 
                    style={{
                      padding: '1.5rem',
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      handleSelectFromList(overview)
                      setShowAIModal(true)
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                          {overview.title}
                        </h3>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          Created {new Date(overview.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAIOverview(overview.id)
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
                          fontSize: '16px'
                        }}
                        title="Delete AI Overview"
                      >
                        🗑️
                      </button>
                    </div>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '14px', 
                      color: 'var(--muted)',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {(overview.content || overview.text || '').length > 150 
                        ? (overview.content || overview.text || '').substring(0, 150) + '...' 
                        : (overview.content || overview.text || '')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'participants' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--muted)' }}>group</span>
                Study Participants
              </h2>
              <button
                onClick={() => setShowParticipantModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--tab-active)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                Add Participant
              </button>
            </div>
            
            {/* Participants List */}
            {participants.length === 0 ? (
              <div style={{
                padding: '3rem',
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                textAlign: 'center',
                color: 'var(--muted)'
              }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '16px' }}>No participants added yet.</p>
                <p style={{ margin: 0, fontSize: '14px' }}>Click the button above to add your first participant.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {participants.map(participant => (
                  <div 
                    key={participant.id}
                    style={{
                      padding: '1rem 1.5rem',
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: activeSession?.participant_id === participant.id ? '#22c55e' : 'var(--tab-active)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '14px',
                        position: 'relative'
                      }}>
                        {participant.name.charAt(0).toUpperCase()}
                        {activeSession?.participant_id === participant.id && (
                          <div style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: '#22c55e',
                            border: '2px solid var(--card-bg)'
                          }} />
                        )}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: 'var(--text)' }}>
                          {participant.name}
                          {activeSession?.participant_id === participant.id && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '12px', color: '#22c55e', fontWeight: '600' }}>
                              ● Active Session
                            </span>
                          )}
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                          Added {new Date(participant.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* Session button - only show if this participant has active session OR no active session exists */}
                      {activeSession?.participant_id === participant.id ? (
                        <button
                          onClick={handleEndSession}
                          disabled={sessionLoading}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.5rem 0.75rem',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: sessionLoading ? 'wait' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            opacity: sessionLoading ? 0.7 : 1
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>stop</span>
                          End Session
                        </button>
                      ) : !activeSession && (
                        <button
                          onClick={() => handleStartSession(participant.id)}
                          disabled={sessionLoading}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.5rem 0.75rem',
                            backgroundColor: '#22c55e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: sessionLoading ? 'wait' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            opacity: sessionLoading ? 0.7 : 1
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>play_arrow</span>
                          Start Session
                        </button>
                      )}
                      
                      {/* Sessions history button */}
                      <button
                        onClick={() => navigate(`/participant/${participant.id}/sessions`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: 'var(--bg)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        title="View session history"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>history</span>
                        Sessions
                      </button>
                      
                      {/* Delete button */}
                      <button
                        onClick={async () => {
                          if (confirm(`Delete participant "${participant.name}"?`)) {
                            await removeParticipant(participant.id)
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          padding: '0.5rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Delete participant"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Page Modal */}
      {showNewPageModal && (
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
        }} onClick={() => setShowNewPageModal(false)}>
          <div style={{
            width: '90%',
            maxWidth: '500px',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: '1rem 1.5rem',
              backgroundColor: 'var(--tab-active)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                Create New Search Page
              </h2>
              <button
                onClick={() => setShowNewPageModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '14px', color: 'var(--muted)', lineHeight: '1.5' }}>
                Create a new search page with its own URL. After creating the page, you can add custom search results to it.
              </p>

              <form onSubmit={async (e) => {
                e.preventDefault()
                if (!newPageFormData.query.trim() || !newPageFormData.displayName.trim()) {
                  alert('Please fill in all fields')
                  return
                }
                
                // Create page using realtime hook
                const queryKey = newPageFormData.query.toLowerCase().replace(/\s+/g, '+')
                const searchKey = newPageFormData.query.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                
                const newPage = await addPage({
                  query: newPageFormData.query,
                  queryKey: queryKey,
                  searchKey: searchKey,
                  displayName: newPageFormData.displayName
                })
                
                setNewPageFormData({ query: '', displayName: '' })
                setShowNewPageModal(false)
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
                    Search Query *
                  </label>
                  <input
                    type="text"
                    value={newPageFormData.query}
                    onChange={(e) => setNewPageFormData({
                      query: e.target.value,
                      displayName: newPageFormData.displayName || e.target.value
                    })}
                    placeholder="e.g., best running shoes"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text)'
                    }}
                    required
                  />
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                    This will be used in the URL: /session?q={newPageFormData.query.toLowerCase().replace(/\s+/g, '+')}
                  </p>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={newPageFormData.displayName}
                    onChange={(e) => setNewPageFormData({ ...newPageFormData, displayName: e.target.value })}
                    placeholder="e.g., Best Running Shoes"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text)'
                    }}
                    required
                  />
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                    This is what users will see in the search bar
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowNewPageModal(false)}
                    style={{
                      padding: '0.75rem 1.25rem',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--card-bg)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.75rem 1.25rem',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: 'var(--tab-active)',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Create Page
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* AI Overview Manager Modal */}
      {showAIModal && (
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
        }} onClick={closeAIModal}>
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
                {aiModalView === 'editor' && (aiOverviews.length > 0 || editingAIOverview) && (
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
                  {aiModalView === 'editor' ? 'Set AI Overview Text' : 'AI Overview Manager'}
                </h2>
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
                  if (aiModalView === 'editor') {
                    saveAIOverview()
                  } else {
                    closeAIModal()
                  }
                }}
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
              {aiModalView === 'editor' ? (
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
                            border: `1px solid ${editingAIOverview?.id === overview.id ? 'var(--tab-active)' : 'var(--border)'}`,
                            borderRadius: '8px',
                            marginBottom: '0.75rem',
                            background: editingAIOverview?.id === overview.id ? 'color-mix(in hsl, var(--tab-active), transparent 95%)' : 'var(--card-bg)',
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
                                    handleDeleteAIOverview(overview.id)
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
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4', color: 'var(--muted)' }}>
                              {(overview.content || overview.text || '').length > 150 
                                ? (overview.content || overview.text || '').substring(0, 150) + '...' 
                                : (overview.content || overview.text || '')}
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
            {aiModalView === 'editor' && (
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
                  onClick={closeAIModal}
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
                  onClick={saveAIOverview}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Participant Modal */}
      {showParticipantModal && (
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
        }} onClick={() => setShowParticipantModal(false)}>
          <div style={{
            width: '90%',
            maxWidth: '400px',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: '1rem 1.5rem',
              backgroundColor: 'var(--tab-active)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                Add Participant
              </h2>
              <button
                onClick={() => setShowParticipantModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem' }}>
              <form onSubmit={async (e) => {
                e.preventDefault()
                if (!newParticipantName.trim()) {
                  alert('Please enter a participant name')
                  return
                }
                
                await addParticipant(newParticipantName.trim())
                setNewParticipantName('')
                setShowParticipantModal(false)
              }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
                    Participant Name *
                  </label>
                  <input
                    type="text"
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    placeholder="e.g., John Doe"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text)'
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setNewParticipantName('')
                      setShowParticipantModal(false)
                    }}
                    style={{
                      padding: '0.75rem 1.25rem',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--card-bg)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.75rem 1.25rem',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: 'var(--tab-active)',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Add Participant
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
