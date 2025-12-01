import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useRealtimeData from '../hooks/useRealtimeData'
import { getCurrentUser } from '../utils/supabase'
import { getAnyActiveSession } from '../utils/cloudDataV2'

// Helper to get favicon URL - use DuckDuckGo for better transparency
const getFaviconUrl = (url) => {
  try {
    const domain = new URL(url).hostname
    return `https://icons.duckduckgo.com/ip3/${domain}.ico`
  } catch {
    return `https://icons.duckduckgo.com/ip3/example.com.ico`
  }
}

export default function SearchPageDetails() {
  const navigate = useNavigate()
  const { pageId } = useParams()
  
  // User state - use cached user immediately, verify in background
  const [currentUser, setCurrentUser] = useState(() => {
    // Try to get cached user for faster initial load
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

  // Active session state
  const [activeSession, setActiveSession] = useState(null)
  
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
  }, [currentUser])

  // Use realtime data hook
  const {
    pages,
    resultsByPage,
    aiOverviews,
    aiAssignments,
    loading,
    addResult,
    editResult,
    removeResult,
    assignAI,
    unassignAI,
    getPageById
  } = useRealtimeData(currentUser)

  // Find the current page
  const page = useMemo(() => {
    if (!pageId) return null
    
    // Check if it's a built-in page
    if (pageId.startsWith('builtin-')) {
      const key = pageId.replace('builtin-', '')
      return {
        id: pageId,
        search_key: key,
        display_name: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: 'built-in'
      }
    }
    
    // Find custom page by ID
    return pages.find(p => p.id === pageId) || null
  }, [pageId, pages])

  // Get results for this page
  const pageResults = useMemo(() => {
    if (!page) return []
    return resultsByPage[page.id] || []
  }, [page, resultsByPage])

  // Get AI assignment for this page
  const assignedAIOverviewId = page ? aiAssignments[page.id] : null
  const assignedAIOverview = assignedAIOverviewId 
    ? aiOverviews.find(o => o.id === assignedAIOverviewId)
    : null

  // Form state for adding/editing results
  const [editingResult, setEditingResult] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    snippet: ''
  })

  // AI assignment state
  const [selectedAIId, setSelectedAIId] = useState('')

  // Update selected AI when assignment changes
  useEffect(() => {
    setSelectedAIId(assignedAIOverviewId || '')
  }, [assignedAIOverviewId])


  // Form handlers
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.url.trim() || !formData.snippet.trim()) {
      alert('Please fill in all fields')
      return
    }

    if (editingResult) {
      await editResult(editingResult.id, page.id, {
        title: formData.title,
        url: formData.url,
        snippet: formData.snippet,
        favicon: getFaviconUrl(formData.url)
      })
    } else {
      await addResult(page.id, {
        searchType: page.search_key,
        title: formData.title,
        url: formData.url,
        snippet: formData.snippet,
        favicon: getFaviconUrl(formData.url)
      })
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

  const handleDelete = async (resultId) => {
    if (confirm('Are you sure you want to delete this result?')) {
      await removeResult(resultId, page.id)
    }
  }

  const handleAIAssignmentChange = async (e) => {
    const newAIId = e.target.value
    setSelectedAIId(newAIId)
    
    if (newAIId) {
      await assignAI(page.id, newAIId)
    } else {
      await unassignAI(page.id)
    }
  }

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  // Redirect to home if not authenticated
  if (!currentUser) {
    navigate('/')
    return null
  }

  // Show loading
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)' }}>
        <p style={{ color: 'var(--muted)' }}>Loading...</p>
      </div>
    )
  }

  // Show not found
  if (!page) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '1rem', color: 'var(--text)' }}>Page Not Found</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
            The page you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--tab-active)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Back to Home
          </button>
        </div>
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
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--link)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: 0
            }}
          >
            Home
          </button>
          <span style={{ color: 'var(--muted)' }}>/</span>
          <span style={{ color: 'var(--muted)' }}>Pages</span>
          <span style={{ color: 'var(--muted)' }}>/</span>
          <span style={{ color: 'var(--text)', fontWeight: '500' }}>{page.display_name}</span>
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
            onClick={async () => {
              try {
                const { signOut } = await import('../utils/supabase')
                await signOut()
              } catch (error) {
                console.warn('Sign out error:', error)
              }
              localStorage.removeItem('current_user')
              navigate('/')
            }}
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
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--text)' }}>
          {page.display_name}
        </h1>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
          {page.type === 'built-in' ? 'Built-in Page' : 'Custom Page'} • {pageResults.length} results
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* AI Assignment Section */}
        <div style={{
          padding: '1.5rem',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          marginBottom: '2rem'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>
            AI Overview Assignment
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <select
              value={selectedAIId}
              onChange={handleAIAssignmentChange}
              style={{
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                backgroundColor: 'var(--bg)',
                fontSize: '14px',
                minWidth: '300px',
                color: 'var(--text)'
              }}
            >
              <option value="" style={{ color: 'var(--muted)' }}>No AI Overview assigned</option>
              {aiOverviews.map(overview => (
                <option key={overview.id} value={overview.id}>
                  {overview.title}
                </option>
              ))}
            </select>
            {assignedAIOverview && (
              <span style={{ fontSize: '14px', color: '#16a34a' }}>
                ✓ Assigned
              </span>
            )}
          </div>
        </div>

        {/* Add/Edit Result Form */}
        <div style={{
          padding: '1.5rem',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          marginBottom: '2rem'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>
            {editingResult ? 'Edit Search Result' : 'Add New Search Result'}
          </h2>
          
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
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)'
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
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)'
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
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)'
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
                  borderRadius: '6px',
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
                    borderRadius: '6px',
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

        {/* Results List */}
        <div style={{
          padding: '1.5rem',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>
            Search Results ({pageResults.length})
          </h2>
          
          {pageResults.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
              No search results yet. Add one above to get started.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {pageResults.map(result => (
                <div key={result.id} style={{
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <img 
                      src={result.favicon || getFaviconUrl(result.url)} 
                      alt="Favicon"
                      style={{ 
                        width: '20px', 
                        height: '20px', 
                        marginTop: '2px', 
                        flexShrink: 0, 
                        borderRadius: '50%', 
                        border: '1px solid var(--border)' 
                      }}
                      onError={(e) => {
                        e.target.src = `https://icons.duckduckgo.com/ip3/example.com.ico`
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '16px', fontWeight: '500', color: 'var(--link)' }}>
                        {result.title}
                      </h4>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '12px', color: '#16a34a' }}>
                        {result.url}
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)', lineHeight: '1.4' }}>
                        {result.snippet}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={() => handleEdit(result)}
                        style={{
                          padding: '0.5rem 1rem',
                          border: 'none',
                          borderRadius: '4px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(result.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          border: 'none',
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
  )
}
