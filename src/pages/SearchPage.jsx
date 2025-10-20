import React, { useState } from 'react'
import AIOverview from '../components/AIOverview'
import SearchResult from '../components/SearchResult'
import AdResult from '../components/AdResult'

export default function SearchPage({ config, onResultClick }) {
  if (!config) return null
  const { query, aiOverview, results } = config
  
  // State to manage images for each result
  const [resultImages, setResultImages] = useState({})
  
  const handleImagesUpdate = (resultUrl, images) => {
    setResultImages(prev => ({
      ...prev,
      [resultUrl]: images
    }))
  }

  return (
    <div className="w-full">
      <div className="w-full">
        <div className="w-full max-w-[652px] px-0">
          {/* AI Overview */}
          {aiOverview?.show && (
            <div className="mt-0 md:mt-4 mb-4">
              <AIOverview text={aiOverview.text} />
              <div className="ai-separator" />
            </div>
          )}

          {/* Results */}
          <div className="mt-2">
            {results.slice(0, 10).map((r, idx, arr) => (
              <React.Fragment key={idx}>
                {r.ad ? (
                  <AdResult {...r} query={query} onClick={onResultClick} />
                ) : (
                  <SearchResult 
                    {...r} 
                    query={query} 
                    onClick={onResultClick}
                    images={resultImages[r.url] || r.images || []}
                    onImagesUpdate={handleImagesUpdate}
                  />
                )}
                {idx < arr.length - 1 && <div className="result-divider" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
