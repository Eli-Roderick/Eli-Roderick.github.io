import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import SearchResultsPage from './pages/SearchResultsPage'
import SessionPage from './pages/SessionPage'
import HomePage from './pages/HomePage'
import SearchPageDetails from './pages/SearchPageDetails'
import ParticipantSessions from './pages/ParticipantSessions'

export default function AppRouter() {
  console.log('AppRouter rendering, current path:', window.location.pathname)
  return (
    <Router>
      <Routes>
        {/* Home page */}
        <Route path="/" element={<HomePage />} />
        {/* Page details */}
        <Route path="/page/:pageId" element={<SearchPageDetails />} />
        {/* Participant sessions */}
        <Route path="/participant/:participantId/sessions" element={<ParticipantSessions />} />
        {/* Session route - user-facing search experience */}
        <Route path="/session" element={<SessionPage />} />
        {/* Google-style search URL */}
        <Route path="/search" element={<SessionPage />} />
        {/* Legacy routes - redirect to Google-style URLs */}
        <Route path="/search/hiking-boots" element={<Navigate to="/search?q=best+hiking+boots&oq=best+hiking+boots&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8" replace />} />
        <Route path="/search/breakfast-ideas" element={<Navigate to="/search?q=healthy+breakfast+ideas&oq=healthy+breakfast+ideas&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8" replace />} />
        <Route path="/search/electric-cars" element={<Navigate to="/search?q=electric+cars+2025&oq=electric+cars+2025&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8" replace />} />
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
