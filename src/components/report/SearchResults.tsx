"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Grid, Heart, Package } from "lucide-react";
import { useState } from "react";
import type { ProductIndex, Product } from "@/types/report";
import { useFavorites } from "@/hooks/useFavorites";

interface SearchResultsProps {
  results: ProductIndex[];
  isLoading: boolean;
  hasSearched: boolean;
  reportId: string;
  referenceProduct?: Product; // Keep as Product since the reference in reports is the full Product
}

interface ViewMode {
  type: "grid" | "favorites";
}

export function SearchResults({ results, isLoading, hasSearched, reportId }: SearchResultsProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode["type"]>("grid");
  const { favorites, isFavorited, toggleFavorite } = useFavorites(reportId);

  const getProductNameText = (product: ProductIndex) => {
    const parts = [];
    if (product.brand) parts.push(product.brand);
    if (product.series) parts.push(product.series);
    if (product.model) parts.push(product.model);
    return parts.join(' ') || 'Unknown Product';
  };

  const formatProductName = (product: ProductIndex) => {
    const brandSeries = [];
    if (product.brand) brandSeries.push(product.brand);
    if (product.series) brandSeries.push(product.series);
    
    const lines = [];
    
    // Brand and series on first line (if they exist)
    if (brandSeries.length > 0) {
      lines.push(
        <div key="brand-series" className="search-result-card__name-line">
          {brandSeries.map((part, index) => (
            <span key={index}>
              {part}
              {index < brandSeries.length - 1 && (
                <span className="search-result-card__separator">›</span>
              )}
            </span>
          ))}
        </div>
      );
    }
    
    // Model on its own line (highlighted)
    if (product.model) {
      lines.push(
        <div key="model" className="search-result-card__name-line">
          {product.model}
        </div>
      );
    }
    
    return lines.length > 0 ? lines : 'Unknown Product';
  };

  const getSimilarity = (product: ProductIndex) => {
    return product.analysis?.similarity ? 
      Math.round(product.analysis.similarity * 100) : 
      0; // Products without similarity data go to bottom
  };

  const getSimilarityColorClass = (similarity: number) => {
    if (similarity >= 90) return "similarity-excellent";
    if (similarity >= 80) return "similarity-good";
    if (similarity >= 70) return "similarity-fair";
    if (similarity >= 60) return "similarity-poor";
    return "similarity-very-poor";
  };

  const sortProducts = (products: ProductIndex[]) => {
    return [...products].sort((a, b) => {
      // First sort by similarity (descending)
      const aSimilarity = getSimilarity(a);
      const bSimilarity = getSimilarity(b);
      
      if (aSimilarity !== bSimilarity) {
        return bSimilarity - aSimilarity;
      }
      
      // Then sort alphabetically by formatted name
      const aName = getProductNameText(a);
      const bName = getProductNameText(b);
      return aName.localeCompare(bName);
    });
  };

      const handleProductClick = (productId: string) => {
    console.log('SearchResults: handleProductClick called with productId:', productId);
    console.log('SearchResults: Current reportId:', reportId);
    
    if (!reportId) {
      console.error('SearchResults: No reportId available for navigation');
      return;
    }
    
    // Navigate to product comparison using query parameters
    const url = `/fetch?report=${reportId}&product=${productId}`;
    console.log('SearchResults: Navigating to URL:', url);
    router.push(url);
  };

  const handleFavoriteClick = (e: React.MouseEvent, product: ProductIndex) => {
    e.stopPropagation(); // Prevent triggering product click
    toggleFavorite(product);
  };

  // Get the current products to display based on view mode
  const displayProducts = sortProducts(
    viewMode === "favorites" 
      ? favorites.map(fav => {
          // Try to find similarity from current results, fallback to stored analysis
          const resultMatch = results.find(r => r.id === fav.id);
          const finalAnalysis = resultMatch?.analysis || fav.analysis;
          
          return {
            id: fav.id,
            brand: fav.brand,
            series: fav.series,
            model: fav.model,
            image: fav.image,
            analysis: finalAnalysis
          } as ProductIndex;
        })
      : results
  );

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

  if (viewMode === "favorites" && displayProducts.length === 0) {
    return (
      <div className="search-results">
        <div className="search-results__header">
          <div className="search-results__title-section">
            <h2 className="search-results__title">Favorites</h2>
            <span className="search-results__count">0 favorites</span>
          </div>
          
          <div className="search-results__view-controls">
            <button
              onClick={() => setViewMode("grid")}
              className="search-results__view-btn"
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("favorites")}
              className="search-results__view-btn search-results__view-btn--active"
              aria-label="Favorites view"
            >
              <Heart className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="search-results__empty">
          <Heart className="w-12 h-12 text-gray-400" />
          <h3>No favorites yet</h3>
          <p>Click the heart icon on any product to add it to your favorites.</p>
        </div>
      </div>
    );
  }

  if (viewMode === "grid" && results.length === 0) {
    return (
      <div className="search-results">
        <div className="search-results__header">
          <div className="search-results__title-section">
            <h2 className="search-results__title">Search Results</h2>
            <span className="search-results__count">0 products found</span>
          </div>
          
          <div className="search-results__view-controls">
            <button
              onClick={() => setViewMode("grid")}
              className="search-results__view-btn search-results__view-btn--active"
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("favorites")}
              className="search-results__view-btn"
              aria-label="Favorites view"
            >
              <Heart className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="search-results__empty">
          <Package className="w-12 h-12 text-gray-400" />
          {!hasSearched ? (
            <>
              <h3>No search performed</h3>
              <p>Adjust your filters in the left sidebar and click &quot;Search Similar Products&quot; to find matching products.</p>
            </>
          ) : (
            <>
              <h3>No products found</h3>
              <p>No products match your current search criteria. Try adjusting your filters and search again.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="search-results">
      {/* Header with view controls */}
      <div className="search-results__header">
        <div className="search-results__title-section">
          <h2 className="search-results__title">
            {viewMode === "favorites" ? "Favorites" : "Search Results"}
          </h2>
          <span className="search-results__count">
            {displayProducts.length} {viewMode === "favorites" 
              ? (displayProducts.length === 1 ? "favorite" : "favorites")
              : (displayProducts.length === 1 ? "product found" : "products found")
            }
          </span>
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
            onClick={() => setViewMode("favorites")}
            className={`search-results__view-btn ${
              viewMode === "favorites" ? "search-results__view-btn--active" : ""
            }`}
            aria-label="Favorites view"
          >
            <Heart className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results content */}
      <div className="search-results__content">
        <div className="search-results__grid">
          {displayProducts.map((product) => (
            <div 
              key={product.id} 
              className="search-result-card"
              onClick={() => handleProductClick(product.id)}
            >
              <div className="search-result-card__image">
                <Image
                  src={product.image || "/placeholder.svg"}
                  alt={getProductNameText(product)}
                  fill
                  className="search-result-card__img"
                  sizes="200px"
                  unoptimized
                />
                <button
                  className={`search-result-card__favorite ${
                    isFavorited(product.id) ? "search-result-card__favorite--active" : ""
                  }`}
                  onClick={(e) => handleFavoriteClick(e, product)}
                  aria-label={isFavorited(product.id) ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart 
                    className="w-4 h-4" 
                    fill={isFavorited(product.id) ? "currentColor" : "none"}
                  />
                </button>
              </div>
              
              <div className="search-result-card__content">
                <div className="search-result-card__info">
                  <div className={`search-result-card__similarity ${getSimilarityColorClass(getSimilarity(product))}`}>
                    {getSimilarity(product)}%
                  </div>
                  <h3 className="search-result-card__title">
                    {formatProductName(product)}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}