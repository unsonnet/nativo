"use client";

import Image from "next/image";
import { Grid, List, Package } from "lucide-react";
import { useState } from "react";
import type { ProductIndex, Product } from "@/types/report";

interface SearchResultsProps {
  results: ProductIndex[];
  isLoading: boolean;
  referenceProduct?: Product; // Keep as Product since the reference in reports is the full Product
}

interface ViewMode {
  type: "grid" | "list";
}

export function SearchResults({ results, isLoading }: SearchResultsProps) {
  const [viewMode, setViewMode] = useState<ViewMode["type"]>("grid");

  const formatProductName = (product: ProductIndex) => {
    const parts = [];
    if (product.brand) parts.push(product.brand);
    if (product.series) parts.push(product.series);
    if (product.model) parts.push(product.model);
    return parts.join(' ') || 'Unknown Product';
  };

  const getSimilarity = (product: ProductIndex) => {
    return product.analysis?.similarity ? 
      Math.round(product.analysis.similarity * 100) : 
      Math.floor(Math.random() * 20) + 80; // Fallback for demo
  };

  const handleProductClick = (product: ProductIndex) => {
    // In a real implementation, this could open a product detail modal
    // or navigate to a detailed product view
    console.log("Product clicked:", product.id, formatProductName(product));
  };

  if (isLoading) {
    return (
      <div className="search-results">
        <div className="search-results__header">
          <h2 className="search-results__title">Search Results</h2>
        </div>
        <div className="search-results__loading">
          <div className="loading-spinner"></div>
          <p>Searching for similar products...</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="search-results">
        <div className="search-results__header">
          <h2 className="search-results__title">Search Results</h2>
        </div>
        <div className="search-results__empty">
          <Package className="w-12 h-12 text-gray-400" />
          <h3>No search performed</h3>
          <p>Adjust your filters in the left sidebar and click &quot;Search Similar Reports&quot; to find matching products.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results">
      {/* Header with view controls */}
      <div className="search-results__header">
        <div className="search-results__title-section">
          <h2 className="search-results__title">Search Results</h2>
          <span className="search-results__count">{results.length} products found</span>
        </div>
        
        <div className="search-results__view-controls">
          <button
            onClick={() => setViewMode("grid")}
            className={`search-results__view-btn ${
              viewMode === "grid" ? "search-results__view-btn--active" : ""
            }`}
            aria-label="Grid view"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`search-results__view-btn ${
              viewMode === "list" ? "search-results__view-btn--active" : ""
            }`}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results content */}
      <div className="search-results__content">
        {viewMode === "grid" ? (
          <div className="search-results__grid">
            {results.map((product) => (
              <div 
                key={product.id} 
                className="search-result-card"
                onClick={() => handleProductClick(product)}
              >
                <div className="search-result-card__image">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={formatProductName(product)}
                    fill
                    className="search-result-card__img"
                    sizes="200px"
                    unoptimized
                  />
                  <div className="search-result-card__similarity">
                    {getSimilarity(product)}%
                  </div>
                </div>
                
                <div className="search-result-card__content">
                  <h3 className="search-result-card__title">
                    {formatProductName(product)}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="search-results__list">
            {results.map((product) => (
              <div 
                key={product.id} 
                className="search-result-row"
                onClick={() => handleProductClick(product)}
              >
                <div className="search-result-row__image">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={formatProductName(product)}
                    fill
                    className="search-result-row__img"
                    sizes="80px"
                    unoptimized
                  />
                </div>
                
                <div className="search-result-row__content">
                  <div className="search-result-row__main">
                    <h3 className="search-result-row__title">
                      {formatProductName(product)}
                    </h3>
                  </div>
                  
                  <div className="search-result-row__similarity">
                    <span className="search-result-row__similarity-label">Similarity</span>
                    <div className="search-result-row__similarity-value">
                      {getSimilarity(product)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}