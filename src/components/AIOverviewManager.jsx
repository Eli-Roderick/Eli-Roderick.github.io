import React, { useState } from 'react'
import Icon from '@mdi/react'
import { mdiClose, mdiPlus, mdiDelete, mdiCheck, mdiPencil } from '@mdi/js'

export default function AIOverviewManager({ 
  isOpen, 
  onClose, 
  aiOverviews, 
  selectedAIOverviewId, 
  onSelect, 
  onCreate, 
  onDelete, 
  onUpdate 
}) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editText, setEditText] = useState('')

  if (!isOpen) return null

  const handleCreate = () => {
    if (newText.trim()) {
      onCreate(newTitle, newText)
      setNewTitle('')
      setNewText('')
      setShowCreateForm(false)
    }
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ai-overview-manager" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>AI Overview Manager</h2>
          <button className="modal-close" onClick={onClose}>
            <Icon path={mdiClose} size={1} />
          </button>
        </div>

        <div className="modal-body">
          {/* Create New Button */}
          {!showCreateForm && (
            <button 
              className="create-overview-btn"
              onClick={() => setShowCreateForm(true)}
            >
              <Icon path={mdiPlus} size={0.8} />
              Create New AI Overview
            </button>
          )}

          {/* Create Form */}
          {showCreateForm && (
            <div className="create-form">
              <input
                type="text"
                placeholder="Title (optional)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="title-input"
              />
              <textarea
                placeholder="Enter AI overview text..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="text-input"
                rows={4}
              />
              <div className="form-actions">
                <button onClick={handleCreate} className="save-btn">
                  <Icon path={mdiCheck} size={0.8} />
                  Save
                </button>
                <button onClick={() => setShowCreateForm(false)} className="cancel-btn">
                  Cancel
                </button>
              </div>
            </div>
          )}

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
                      <div className="overview-content" onClick={() => onSelect(overview.id)}>
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
      </div>
    </div>
  )
}
