import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import SearchResultsPage from './pages/SearchResultsPage'

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* Google-style search URL */}
        <Route path="/search" element={<SearchResultsPage />} />
        {/* Default to hiking boots search */}
        <Route path="/" element={<Navigate to="/search?q=best+hiking+boots&oq=best+hiking+boots&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8" replace />} />
        {/* Legacy routes - redirect to Google-style URLs */}
        <Route path="/search/hiking-boots" element={<Navigate to="/search?q=best+hiking+boots&oq=best+hiking+boots&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8" replace />} />
        <Route path="/search/breakfast-ideas" element={<Navigate to="/search?q=healthy+breakfast+ideas&oq=healthy+breakfast+ideas&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8" replace />} />
        <Route path="/search/electric-cars" element={<Navigate to="/search?q=electric+cars+2025&oq=electric+cars+2025&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8" replace />} />
        {/* Fallback route - only redirect root and invalid paths, not search queries */}
        <Route path="*" element={<Navigate to="/search?q=best+hiking+boots&oq=best+hiking+boots&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8" replace />} />
      </Routes>
    </Router>
  )
}
