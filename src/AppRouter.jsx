import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import SearchResultsPage from './pages/SearchResultsPage'

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* Default to hiking boots search */}
        <Route path="/" element={<Navigate to="/search/hiking-boots" replace />} />
        <Route path="/search/:searchType" element={<SearchResultsPage />} />
        {/* Fallback route - also redirect to hiking boots */}
        <Route path="*" element={<Navigate to="/search/hiking-boots" replace />} />
      </Routes>
    </Router>
  )
}
