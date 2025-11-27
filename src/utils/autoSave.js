// Auto-save functions that immediately write to Supabase
// These replace all setUserData() calls

import {
  saveIndividualCustomPage,
  saveIndividualAIOverview,
  saveIndividualSearchResults,
  saveCurrentAIText,
  saveSetting,
  saveCustomSearchPages,
  saveAIOverviews,
  saveSearchResultAssignments,
  saveCustomSearchResults,
  saveResultImages,
  saveDeletedBuiltinPages
} from './cloudData'

// Global state for saving indicators
let savingIndicators = new Set()
let saveCallbacks = new Set()

// Add callback for save status updates
export const onSaveStatusChange = (callback) => {
  saveCallbacks.add(callback)
  return () => saveCallbacks.delete(callback)
}

// Notify all callbacks of save status change
const notifySaveStatus = () => {
  const isSaving = savingIndicators.size > 0
  saveCallbacks.forEach(callback => callback(isSaving))
}

// Generic auto-save wrapper
const autoSave = async (key, saveFunction, ...args) => {
  savingIndicators.add(key)
  notifySaveStatus()
  
  try {
    const success = await saveFunction(...args)
    if (!success) {
      console.warn(`⚠️ Auto-save failed for ${key}`)
      // Could show user notification here
    }
    return success
  } catch (error) {
    console.error(`❌ Auto-save error for ${key}:`, error)
    return false
  } finally {
    savingIndicators.delete(key)
    notifySaveStatus()
  }
}

// ============================================================================
// AUTO-SAVE FUNCTIONS (replace setUserData calls)
// ============================================================================

export const autoSaveCustomSearchPages = async (pages) => {
  return autoSave('custom_search_pages', saveCustomSearchPages, pages)
}

export const autoSaveCustomPage = async (queryKey, pageData) => {
  return autoSave(`custom_page_${queryKey}`, saveIndividualCustomPage, queryKey, pageData)
}

export const autoSaveAIOverviews = async (overviews) => {
  return autoSave('ai_overviews', saveAIOverviews, overviews)
}

export const autoSaveAIOverview = async (overview) => {
  return autoSave(`ai_overview_${overview.id}`, saveIndividualAIOverview, overview)
}

export const autoSaveCurrentAIText = async (text) => {
  return autoSave('current_ai_text', saveCurrentAIText, text)
}

export const autoSaveSearchResultAssignments = async (assignments) => {
  return autoSave('search_result_assignments', saveSearchResultAssignments, assignments)
}

export const autoSaveCustomSearchResults = async (results) => {
  return autoSave('custom_search_results', saveCustomSearchResults, results)
}

export const autoSaveSearchResults = async (searchType, results) => {
  return autoSave(`search_results_${searchType}`, saveIndividualSearchResults, searchType, results)
}

export const autoSaveResultImages = async (images) => {
  return autoSave('result_images', saveResultImages, images)
}

export const autoSaveDeletedBuiltinPages = async (deletedPages) => {
  return autoSave('deleted_builtin_pages', saveDeletedBuiltinPages, deletedPages)
}

export const autoSaveAIOverviewEnabled = async (enabled) => {
  return autoSave('ai_overview_enabled', saveSetting, 'ai_overview_enabled', enabled)
}

export const autoSavePageAIOverviewSettings = async (settings) => {
  return autoSave('page_ai_overview_settings', saveSetting, 'page_ai_overview_settings', settings)
}

// ============================================================================
// DEBOUNCED AUTO-SAVE (for frequent updates like typing)
// ============================================================================

const debouncedSaves = new Map()

export const debouncedAutoSave = (key, saveFunction, delay = 1000) => {
  return (...args) => {
    // Clear existing timeout
    if (debouncedSaves.has(key)) {
      clearTimeout(debouncedSaves.get(key))
    }
    
    // Set new timeout
    const timeoutId = setTimeout(async () => {
      await saveFunction(...args)
      debouncedSaves.delete(key)
    }, delay)
    
    debouncedSaves.set(key, timeoutId)
  }
}

// Debounced version for AI text (saves 1 second after user stops typing)
export const debouncedAutoSaveCurrentAIText = debouncedAutoSave(
  'current_ai_text_debounced',
  autoSaveCurrentAIText,
  1000
)

// ============================================================================
// BATCH SAVE (for multiple related changes)
// ============================================================================

export const batchAutoSave = async (updates) => {
  const savePromises = []
  
  if (updates.customSearchPages) {
    savePromises.push(autoSaveCustomSearchPages(updates.customSearchPages))
  }
  
  if (updates.aiOverviews) {
    savePromises.push(autoSaveAIOverviews(updates.aiOverviews))
  }
  
  if (updates.searchResultAssignments) {
    savePromises.push(autoSaveSearchResultAssignments(updates.searchResultAssignments))
  }
  
  if (updates.customSearchResults) {
    savePromises.push(autoSaveCustomSearchResults(updates.customSearchResults))
  }
  
  if (updates.resultImages) {
    savePromises.push(autoSaveResultImages(updates.resultImages))
  }
  
  if (updates.deletedBuiltinPages) {
    savePromises.push(autoSaveDeletedBuiltinPages(updates.deletedBuiltinPages))
  }
  
  if (updates.currentAIText !== undefined) {
    savePromises.push(autoSaveCurrentAIText(updates.currentAIText))
  }
  
  if (updates.aiOverviewEnabled !== undefined) {
    savePromises.push(autoSaveAIOverviewEnabled(updates.aiOverviewEnabled))
  }
  
  if (updates.pageAIOverviewSettings) {
    savePromises.push(autoSavePageAIOverviewSettings(updates.pageAIOverviewSettings))
  }
  
  const results = await Promise.all(savePromises)
  return results.every(result => result === true)
}
