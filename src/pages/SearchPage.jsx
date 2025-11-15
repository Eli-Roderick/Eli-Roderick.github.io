import React, { useState } from 'react'
import SimpleAIOverview from '../components/SimpleAIOverview'
import SearchResult from '../components/SearchResult'
import AdResult from '../components/AdResult'

export default function SearchPage({ 
  config, 
  onResultClick, 
  resultImages, 
  onImagesUpdate, 
  selectedResultForImages, 
  onCloseImageEditor,
  userAIText,
  aiOverviewEnabled 
}) {
  if (!config) return null
  const { query, aiOverview, results } = config

  return (
    <div className="w-full">
      <div className="w-full">
        <div className="w-full max-w-[580px] px-0">
          {/* AI Overview */}
          {(() => {
            console.log('SearchPage AI Overview DEBUG:')
            console.log('- aiOverview:', aiOverview)
            console.log('- aiOverview?.show:', aiOverview?.show)
            console.log('- aiOverviewEnabled:', aiOverviewEnabled)
            console.log('- userAIText:', userAIText)
            console.log('- aiOverview.text:', aiOverview?.text)
            console.log('- Final content:', userAIText || aiOverview?.text)
            console.log('- Should show:', aiOverview?.show && aiOverviewEnabled && (userAIText || aiOverview?.text))
            return null
          })()}
          {aiOverview?.show && aiOverviewEnabled && (userAIText || aiOverview.text) && (
            <div className="mt-0 md:mt-4 mb-4">
              <SimpleAIOverview htmlContent={userAIText || aiOverview.text} />
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
                    onImagesUpdate={onImagesUpdate}
                    selectedForImageEdit={selectedResultForImages?.url === r.url}
                    onCloseImageEditor={onCloseImageEditor}
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
