import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getCurrentUser } from '../utils/supabase'
import { 
  loadSessionsForParticipant, 
  loadSessionActivity,
  deleteSession,
  getAnyActiveSession,
  endSession
} from '../utils/cloudDataV2'
import { supabase } from '../utils/supabase'

export default function ParticipantSessions() {
  const navigate = useNavigate()
  const { participantId } = useParams()
  const [searchParams] = useSearchParams()
  
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return localStorage.getItem('current_user') || null
    } catch {
      return null
    }
  })
  const [authChecked, setAuthChecked] = useState(!!localStorage.getItem('current_user'))
  
  const [participant, setParticipant] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState(null)
  const [sessionActivities, setSessionActivities] = useState({})
  const [activeSession, setActiveSession] = useState(null)

  // Verify auth in background
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

  // Load active session
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

  // Load participant info
  useEffect(() => {
    const loadParticipant = async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('id', participantId)
        .single()
      
      if (!error && data) {
        setParticipant(data)
      }
    }
    
    if (participantId) {
      loadParticipant()
    }
  }, [participantId])

  // Load sessions
  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true)
      const data = await loadSessionsForParticipant(participantId)
      setSessions(data)
      setLoading(false)
      
      // Auto-expand active session first, then check URL param
      const activeSessionInList = data.find(s => s.status === 'active')
      const expandId = searchParams.get('expand')
      const sessionToExpand = activeSessionInList?.id || (expandId && data.some(s => s.id === expandId) ? expandId : null)
      
      if (sessionToExpand) {
        setExpandedSession(sessionToExpand)
        // Load activity for the expanded session
        const activities = await loadSessionActivity(sessionToExpand)
        setSessionActivities(prev => ({
          ...prev,
          [sessionToExpand]: activities
        }))
      }
    }
    
    if (participantId) {
      loadSessions()
    }
  }, [participantId, searchParams])

  // Subscribe to realtime sessions updates
  useEffect(() => {
    if (!participantId) return

    const channel = supabase
      .channel(`sessions_${participantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `participant_id=eq.${participantId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            setSessions(prev => [payload.new, ...prev])
            setActiveSession(payload.new.status === 'active' ? payload.new : activeSession)
          } else if (payload.eventType === 'UPDATE') {
            setSessions(prev => prev.map(s => s.id === payload.new.id ? payload.new : s))
            // Update active session status
            if (payload.new.status !== 'active' && activeSession?.id === payload.new.id) {
              setActiveSession(null)
            }
          } else if (payload.eventType === 'DELETE') {
            setSessions(prev => prev.filter(s => s.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [participantId, activeSession])

  // Handle stop session
  const handleStopSession = async (sessionId) => {
    await endSession(sessionId)
    setActiveSession(null)
    // Reload sessions to get updated status
    const data = await loadSessionsForParticipant(participantId)
    setSessions(data)
  }

  // Subscribe to realtime activity updates for active session
  useEffect(() => {
    if (!activeSession || expandedSession !== activeSession.id) return

    // Set up realtime subscription for session_activity
    const channel = supabase
      .channel(`session_activity_${activeSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_activity',
          filter: `session_id=eq.${activeSession.id}`
        },
        (payload) => {
          // Add new activity to the list
          setSessionActivities(prev => ({
            ...prev,
            [activeSession.id]: [...(prev[activeSession.id] || []), payload.new]
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeSession, expandedSession])

  // Load activity for expanded session
  const toggleSessionExpand = async (sessionId) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null)
      return
    }
    
    setExpandedSession(sessionId)
    
    if (!sessionActivities[sessionId]) {
      const activities = await loadSessionActivity(sessionId)
      setSessionActivities(prev => ({
        ...prev,
        [sessionId]: activities
      }))
    }
  }

  const handleDeleteSession = async (sessionId) => {
    if (confirm('Delete this session and all its activity?')) {
      const success = await deleteSession(sessionId)
      if (success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
      }
    }
  }

  const formatDuration = (start, end) => {
    if (!end) return 'In progress'
    const ms = new Date(end) - new Date(start)
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const handleExportCSV = async (session) => {
    // Load activities if not already loaded
    let activities = sessionActivities[session.id]
    if (!activities) {
      activities = await loadSessionActivity(session.id)
      setSessionActivities(prev => ({
        ...prev,
        [session.id]: activities
      }))
    }

    // Build CSV content
    const rows = []
    
    // Header row
    rows.push([
      'Participant',
      'Session ID',
      'Session Start',
      'Session End',
      'Session Duration',
      'Activity Type',
      'Activity Timestamp',
      'Time Since Start (ms)',
      'Page ID',
      'Page Name',
      'URL',
      'Title',
      'Click Type',
      'Scroll From',
      'Scroll To',
      'Details (JSON)'
    ].join(','))

    const sessionStart = new Date(session.session_start)
    const sessionEnd = session.session_end ? new Date(session.session_end) : null
    const duration = formatDuration(session.session_start, session.session_end)

    // If no activities, add a row with just session info
    if (!activities || activities.length === 0) {
      rows.push([
        `"${participant?.name || 'Unknown'}"`,
        `"${session.id}"`,
        `"${sessionStart.toISOString()}"`,
        sessionEnd ? `"${sessionEnd.toISOString()}"` : '""',
        `"${duration}"`,
        '""', // Activity Type
        '""', // Activity Timestamp
        '""', // Time Since Start
        '""', // Page ID
        '""', // Page Name
        '""', // URL
        '""', // Title
        '""', // Click Type
        '""', // Scroll From
        '""', // Scroll To
        '""'  // Details
      ].join(','))
    } else {
      // Add a row for each activity
      activities.forEach(activity => {
        const activityTime = new Date(activity.activity_ts)
        const details = activity.details || {}
        // Use stored time_since_start_ms, or calculate as fallback
        const timeSinceStartMs = activity.time_since_start_ms ?? Math.round(activityTime - sessionStart)

        rows.push([
          `"${participant?.name || 'Unknown'}"`,
          `"${session.id}"`,
          `"${sessionStart.toISOString()}"`,
          sessionEnd ? `"${sessionEnd.toISOString()}"` : '""',
          `"${duration}"`,
          `"${activity.activity_type}"`,
          `"${activityTime.toISOString()}"`,
          `"${timeSinceStartMs}"`,
          `"${(activity.page_id || '').replace(/"/g, '""')}"`,
          `"${(activity.page_name || '').replace(/"/g, '""')}"`,
          `"${(details.url || '').replace(/"/g, '""')}"`,
          `"${(details.title || '').replace(/"/g, '""')}"`,
          `"${details.type || ''}"`,
          details.from !== undefined ? `"${details.from}"` : '""',
          details.to !== undefined ? `"${details.to}"` : '""',
          `"${JSON.stringify(details).replace(/"/g, '""')}"`
        ].join(','))
      })
    }

    // Create and download CSV file
    const csvContent = rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    
    // Generate filename
    const dateStr = sessionStart.toISOString().split('T')[0]
    const timeStr = sessionStart.toTimeString().split(' ')[0].replace(/:/g, '-')
    const participantName = (participant?.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `session_${participantName}_${dateStr}_${timeStr}.csv`
    
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }} />
    )
  }

  // Redirect to home if not authenticated
  if (!currentUser) {
    navigate('/')
    return null
  }

  // Show loading
  if (loading && !participant) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)' }}>
        <p style={{ color: 'var(--muted)' }}>Loading...</p>
      </div>
    )
  }

  // Show not found
  if (!participant) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '1rem', color: 'var(--text)' }}>Participant Not Found</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
            The participant you're looking for doesn't exist.
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
          <button
            onClick={() => navigate('/?tab=participants')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--link)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: 0
            }}
          >
            Participants
          </button>
          <span style={{ color: 'var(--muted)' }}>/</span>
          <span style={{ color: 'var(--text)', fontWeight: '500' }}>{participant.name}</span>
          <span style={{ color: 'var(--muted)' }}>/</span>
          <span style={{ color: 'var(--text)', fontWeight: '500' }}>Sessions</span>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {activeSession && (
            <button
              onClick={() => {
                // Already on sessions page, just expand the active session
                setExpandedSession(activeSession.id)
              }}
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
          {participant.name} - Sessions
        </h1>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '14px', color: 'var(--muted)' }}>
          {sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Sessions Section */}
        <div style={{
          padding: '1.5rem',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '18px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--muted)' }}>history</span>
            Session History
          </h2>

          {/* Sessions List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{
              padding: '3rem',
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              textAlign: 'center',
              color: 'var(--muted)'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '16px' }}>No sessions recorded yet.</p>
              <p style={{ margin: 0, fontSize: '14px' }}>Sessions will appear here when you start tracking.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {sessions.map(session => (
              <div 
                key={session.id}
                style={{
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}
              >
                {/* Session Header */}
                <div 
                  style={{
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleSessionExpand(session.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: session.status === 'active' ? '#22c55e' : '#6b7280'
                    }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: 'var(--text)' }}>
                        {new Date(session.session_start).toLocaleDateString()} at {new Date(session.session_start).toLocaleTimeString()}
                      </p>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                        Duration: {formatDuration(session.session_start, session.session_end)}
                        {session.status === 'active' && (
                          <span style={{ marginLeft: '0.5rem', color: '#22c55e', fontWeight: '500' }}>● Active</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {session.status === 'active' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStopSession(session.id)
                        }}
                        style={{
                          backgroundColor: '#dc2626',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                        title="Stop session"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>stop</span>
                        Stop
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleExportCSV(session)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Export to CSV"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSession(session.id)
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
                      title="Delete session"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                    </button>
                    <span 
                      className="material-symbols-outlined" 
                      style={{ 
                        fontSize: '24px', 
                        color: 'var(--muted)',
                        transform: expandedSession === session.id ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}
                    >
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Expanded Activity */}
                {expandedSession === session.id && (
                  <div style={{
                    borderTop: '1px solid var(--border)',
                    padding: '1rem 1.5rem',
                    backgroundColor: 'var(--bg)'
                  }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                      Session Activity
                    </h4>
                    
                    {!sessionActivities[session.id] ? (
                      <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading activity...</p>
                    ) : sessionActivities[session.id].length === 0 ? (
                      <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No activity recorded for this session.</p>
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: '2px',
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
                        fontSize: '12px'
                      }}>
                        {[...sessionActivities[session.id]].reverse().map(activity => {
                          const details = activity.details || {}
                          const time = new Date(activity.activity_ts).toLocaleTimeString()
                          
                          // Format activity based on type
                          let description = ''
                          if (activity.activity_type === 'URL_CLICK') {
                            description = `URL: "${details.title || details.url}"`
                          } else if (activity.activity_type === 'SCROLL_UP' || activity.activity_type === 'SCROLL_DOWN') {
                            description = `${details.from}px → ${details.to}px`
                          } else if (activity.activity_type === 'SESSION_START' || activity.activity_type === 'SESSION_END') {
                            description = ''
                          }
                          
                          // Get page name from activity
                          const pageName = activity.page_name || ''
                          
                          // Color based on activity type
                          const typeColors = {
                            'URL_CLICK': '#2563eb',
                            'SCROLL_UP': '#8b5cf6',
                            'SCROLL_DOWN': '#8b5cf6',
                            'SESSION_START': '#22c55e',
                            'SESSION_END': '#ef4444'
                          }
                          
                          return (
                            <div 
                              key={activity.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.4rem 0.75rem',
                                backgroundColor: 'var(--card-bg)',
                                borderRadius: '3px',
                                borderLeft: `3px solid ${typeColors[activity.activity_type] || '#6b7280'}`
                              }}
                            >
                              <span style={{ 
                                color: 'var(--muted)', 
                                flexShrink: 0,
                                width: '85px'
                              }}>
                                {time}
                              </span>
                              {pageName && (
                                <span style={{ 
                                  color: 'var(--text)',
                                  fontWeight: '500',
                                  flexShrink: 0,
                                  fontSize: '11px',
                                  marginRight: '0.5rem'
                                }}>
                                  Page: {pageName}
                                </span>
                              )}
                              <span style={{ 
                                color: typeColors[activity.activity_type] || 'var(--text)',
                                fontWeight: '600',
                                flexShrink: 0,
                                width: '105px',
                                whiteSpace: 'nowrap'
                              }}>
                                {activity.activity_type.replace('_', ' ')}
                              </span>
                              <span style={{ 
                                color: 'var(--text)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1
                              }}>
                                {description}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
