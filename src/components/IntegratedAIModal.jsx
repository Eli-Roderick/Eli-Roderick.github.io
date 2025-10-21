import React, { useState, useEffect } from 'react'
import Icon from '@mdi/react'
import { mdiClose, mdiArrowLeft, mdiPlus, mdiDelete, mdiCheck, mdiPencil } from '@mdi/js'

export default function IntegratedAIModal({ 
  isOpen, 
  onClose, 
  aiOverviews, 
  selectedAIOverviewId, 
  onSelect, 
  onCreate, 
  onDelete, 
  onUpdate,
  aiOverviewEnabled,
  onToggleEnabled,
  userAIText,
  onTextChange
}) {
  const [view, setView] = useState('editor') // 'editor' or 'list'
  const [draftTitle, setDraftTitle] = useState('')
  const [draftText, setDraftText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editText, setEditText] = useState('')

  // Initialize view and draft text when modal opens
  useEffect(() => {
    if (isOpen) {
      if (selectedAIOverviewId || userAIText) {
        // Show editor if there's a current AI overview
        setView('editor')
        const selectedOverview = aiOverviews.find(overview => overview.id === selectedAIOverviewId)
        if (selectedOverview) {
          setDraftTitle(selectedOverview.title)
          setDraftText(selectedOverview.text)
        } else {
          setDraftTitle('')
          setDraftText(userAIText || '')
        }
      } else {
        // Show list if no current AI overview
        setView('list')
      }
    }
  }, [isOpen, selectedAIOverviewId, userAIText, aiOverviews])

  const handleClose = () => {
    // Save current draft text if in editor mode
    if (view === 'editor') {
      onTextChange(draftText)
    } else {
      // If closing from list view, clear AI text
      onTextChange('')
      onSelect(null)
    }
    onClose()
  }

  const handleBackToList = () => {
    setView('list')
    setDraftTitle('')
    setDraftText('')
  }

  const handleSelectFromList = (overview) => {
    setView('editor')
    setDraftTitle(overview.title)
    setDraftText(overview.text)
    onSelect(overview.id)
  }

  const handleCreateNew = () => {
    setView('editor')
    setDraftTitle('')
    setDraftText('')
    onSelect(null)
  }

  const handleSave = () => {
    if (draftText.trim()) {
      if (selectedAIOverviewId) {
        // Update existing
        onUpdate(selectedAIOverviewId, draftTitle, draftText)
      } else {
        // Create new
        const newId = onCreate(draftTitle, draftText)
        onSelect(newId)
      }
      onTextChange(draftText)
    }
  }

  const handleClear = () => {
    setDraftTitle('')
    setDraftText('')
    onTextChange('')
    onSelect(null)
  }

  const handleEdit = (overview) => {
    setEditingId(overview.id)
    setEditTitle(overview.title)
    setEditText(overview.text)
  }

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onUpdate(editingId, editTitle, editText)
      setEditingId(null)
      setEditTitle('')
      setEditText('')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditText('')
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content integrated-ai-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-left">
            {view === 'editor' && (aiOverviews.length > 0 || selectedAIOverviewId) && (
              <button className="back-btn" onClick={handleBackToList}>
                <Icon path={mdiArrowLeft} size={0.9} />
              </button>
            )}
            <h2>{view === 'editor' ? 'Set AI Overview Text' : 'AI Overview Manager'}</h2>
          </div>
          <div className="header-right">
            {/* AI Overview Toggle */}
            <div className="ai-toggle-container">
              <span className="toggle-label">AI Overview</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={aiOverviewEnabled}
                  onChange={(e) => onToggleEnabled(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <button className="modal-close" onClick={handleClose}>
              <Icon path={mdiClose} size={1} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {view === 'editor' ? (
            <div className="ai-editor">
              <input
                type="text"
                placeholder="Title (optional)"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="title-input"
              />
              <textarea
                placeholder="Enter AI overview text..."
                value={draftText}
                onChange={(e) => {
                  setDraftText(e.target.value)
                  onTextChange(e.target.value)
                }}
                className="text-input"
                rows={12}
              />
              <div className="editor-actions">
                <button onClick={handleClear} className="clear-btn">
                  Clear
                </button>
                <button onClick={handleSave} className="save-btn">
                  <Icon path={mdiCheck} size={0.8} />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="ai-list">
              {/* Create New Button */}
              <button 
                className="create-overview-btn"
                onClick={handleCreateNew}
              >
                <Icon path={mdiPlus} size={0.8} />
                Create New AI Overview
              </button>

              {/* AI Overviews List */}
              <div className="overviews-list">
                {aiOverviews.length === 0 ? (
                  <div className="empty-state">
                    <p>No AI overviews created yet.</p>
                    <p>Create your first one to get started!</p>
                  </div>
                ) : (
                  aiOverviews.map(overview => (
                    <div 
                      key={overview.id} 
                      className={`overview-item ${selectedAIOverviewId === overview.id ? 'selected' : ''}`}
                    >
                      {editingId === overview.id ? (
                        <div className="edit-form">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="title-input"
                            placeholder="Title"
                          />
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="text-input"
                            rows={3}
                          />
                          <div className="form-actions">
                            <button onClick={handleSaveEdit} className="save-btn">
                              <Icon path={mdiCheck} size={0.7} />
                            </button>
                            <button onClick={handleCancelEdit} className="cancel-btn">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="overview-content" onClick={() => handleSelectFromList(overview)}>
                            <div className="overview-header">
                              <h3>{overview.title}</h3>
                              <span className="overview-date">{formatDate(overview.createdAt)}</span>
                            </div>
                            <p className="overview-preview">
                              {overview.text.length > 150 
                                ? overview.text.substring(0, 150) + '...' 
                                : overview.text}
                            </p>
                          </div>
                          <div className="overview-actions">
                            <button 
                              onClick={() => handleEdit(overview)} 
                              className="edit-btn"
                              title="Edit"
                            >
                              <Icon path={mdiPencil} size={0.7} />
                            </button>
                            <button 
                              onClick={() => onDelete(overview.id)} 
                              className="delete-btn"
                              title="Delete"
                            >
                              <Icon path={mdiDelete} size={0.7} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
