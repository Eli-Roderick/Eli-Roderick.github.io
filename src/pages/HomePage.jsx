import React from 'react'
import { Link } from 'react-router-dom'

export default function HomePage() {
  const searchConfigs = [
    { label: "Best hiking boots", path: "hiking-boots", description: "Outdoor gear and hiking equipment search results" },
    { label: "Healthy breakfast ideas", path: "breakfast-ideas", description: "Nutritious meal planning and recipes" },
    { label: "Electric cars 2025", path: "electric-cars", description: "Latest electric vehicle models and reviews" }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-normal">
              <span className="text-blue-500">G</span>
              <span className="text-red-500">o</span>
              <span className="text-yellow-500">o</span>
              <span className="text-blue-500">g</span>
              <span className="text-green-500">l</span>
              <span className="text-red-500">e</span>
            </div>
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Google or type a URL"
                  className="w-full px-4 py-3 border border-gray-300 rounded-full text-base outline-none focus:border-blue-500 focus:shadow-md"
                  readOnly
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-full">
                    <span className="material-symbols-outlined text-gray-600">search</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light text-gray-800 mb-4">
            Search Interface Demo
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Choose a search scenario to explore different result layouts and AI overviews
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchConfigs.map((config) => (
            <Link
              key={config.path}
              to={`/search/${config.path}`}
              className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition-all duration-200 group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <span className="material-symbols-outlined text-blue-600">search</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {config.label}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {config.description}
                  </p>
                  <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                    View Results
                    <span className="material-symbols-outlined ml-1 text-sm">arrow_forward</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full text-sm text-gray-600">
            <span className="material-symbols-outlined text-sm">info</span>
            This is a demo interface showcasing different search result layouts
          </div>
        </div>
      </main>
    </div>
  )
}
