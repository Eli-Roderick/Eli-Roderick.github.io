// SessionPage - Wrapper for SearchResultsPage that uses /session route
// This is the user-facing session view (non-admin)

import SearchResultsPage from './SearchResultsPage'

export default function SessionPage() {
  return <SearchResultsPage isAdmin={false} />
}
