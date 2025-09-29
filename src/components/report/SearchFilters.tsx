"use client";

import { useState } from "react";
import { Search, Sliders } from "lucide-react";
import type { Product } from "@/types/report";

export interface SearchFilters {
  maxLengthDiff?: number;
  maxWidthDiff?: number;
  colorPrimarySimilarity?: number;
  colorSecondarySimilarity?: number;
  patternPrimarySimilarity?: number;
  patternSecondarySimilarity?: number;
  categories: {
    type?: string[];
    material?: string[];
    look?: string[];
    texture?: string[];
    finish?: string[];
    edge?: string[];
  };
}

interface SearchFiltersProps {
  referenceProduct: Product;
  onSearch: (filters: SearchFilters) => void;
  isSearching: boolean;
}

export function SearchFilters({ referenceProduct, onSearch, isSearching }: SearchFiltersProps) {
  const format = referenceProduct.formats?.[0];
  const hasAbsoluteDimensions = format?.length?.unit !== 'none' && format?.width?.unit !== 'none';
  
  const [filters, setFilters] = useState<SearchFilters>({
    maxLengthDiff: 2,
    maxWidthDiff: 2,
    colorPrimarySimilarity: 80,
    colorSecondarySimilarity: 70,
    patternPrimarySimilarity: 75,
    patternSecondarySimilarity: 65,
    categories: {
      // Pre-populate with reference product categories for convenience
      type: referenceProduct.category.type ? [referenceProduct.category.type] : [],
      material: referenceProduct.category.material ? [referenceProduct.category.material] : [],
    }
  });

  // Mock category options - in real app, these would come from your database
  const categoryOptions = {
    type: ["Hardwood", "Laminate", "Vinyl", "Tile", "Carpet"],
    material: ["Oak", "Maple", "Cherry", "Pine", "Bamboo", "Ceramic", "Porcelain"],
    look: ["Traditional", "Modern", "Rustic", "Contemporary", "Industrial"],
    texture: ["Smooth", "Textured", "Embossed", "Hand-scraped", "Wire-brushed"],
    finish: ["Matte", "Satin", "Gloss", "Semi-gloss", "Natural"],
    edge: ["Square", "Beveled", "Micro-beveled", "Eased", "Pillowed"]
  };

  const handleFilterChange = (key: keyof SearchFilters, value: unknown) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCategoryChange = (category: keyof SearchFilters["categories"], option: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: checked 
          ? [...(prev.categories[category] || []), option]
          : (prev.categories[category] || []).filter(item => item !== option)
      }
    }));
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const resetFilters = () => {
    setFilters({
      maxLengthDiff: 2,
      maxWidthDiff: 2,
      colorPrimarySimilarity: 80,
      colorSecondarySimilarity: 70,
      patternPrimarySimilarity: 75,
      patternSecondarySimilarity: 65,
      categories: {
        // Reset to reference product categories
        type: referenceProduct.category.type ? [referenceProduct.category.type] : [],
        material: referenceProduct.category.material ? [referenceProduct.category.material] : [],
      }
    });
  };

  return (
    <div className="search-filters">
      <div className="search-filters__header">
        <h3 className="search-filters__title">
          <Sliders className="w-4 h-4" />
          Search Filters
        </h3>
        <button 
          onClick={resetFilters}
          className="search-filters__reset"
        >
          Reset
        </button>
      </div>

      <div className="search-filters__content">
        {/* Dimension Filters - only show if reference has absolute dimensions */}
        {hasAbsoluteDimensions && (
          <div className="search-filters__section">
            <h4 className="search-filters__section-title">Dimension Similarity</h4>
            
            <div className="search-filters__field">
              <label className="search-filters__label">
                Max Length Difference ({format?.length?.unit})
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={filters.maxLengthDiff}
                onChange={(e) => handleFilterChange('maxLengthDiff', parseFloat(e.target.value))}
                className="search-filters__slider"
              />
              <span className="search-filters__value">±{filters.maxLengthDiff}</span>
            </div>

            <div className="search-filters__field">
              <label className="search-filters__label">
                Max Width Difference ({format?.width?.unit})
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={filters.maxWidthDiff}
                onChange={(e) => handleFilterChange('maxWidthDiff', parseFloat(e.target.value))}
                className="search-filters__slider"
              />
              <span className="search-filters__value">±{filters.maxWidthDiff}</span>
            </div>
          </div>
        )}

        {/* Color & Pattern Similarity */}
        <div className="search-filters__section">
          <h4 className="search-filters__section-title">Visual Similarity (%)</h4>
          
          <div className="search-filters__field">
            <label className="search-filters__label">Primary Color</label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.colorPrimarySimilarity}
              onChange={(e) => handleFilterChange('colorPrimarySimilarity', parseInt(e.target.value))}
              className="search-filters__slider"
            />
            <span className="search-filters__value">{filters.colorPrimarySimilarity}%</span>
          </div>

          <div className="search-filters__field">
            <label className="search-filters__label">Secondary Color</label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.colorSecondarySimilarity}
              onChange={(e) => handleFilterChange('colorSecondarySimilarity', parseInt(e.target.value))}
              className="search-filters__slider"
            />
            <span className="search-filters__value">{filters.colorSecondarySimilarity}%</span>
          </div>

          <div className="search-filters__field">
            <label className="search-filters__label">Primary Pattern</label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.patternPrimarySimilarity}
              onChange={(e) => handleFilterChange('patternPrimarySimilarity', parseInt(e.target.value))}
              className="search-filters__slider"
            />
            <span className="search-filters__value">{filters.patternPrimarySimilarity}%</span>
          </div>

          <div className="search-filters__field">
            <label className="search-filters__label">Secondary Pattern</label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.patternSecondarySimilarity}
              onChange={(e) => handleFilterChange('patternSecondarySimilarity', parseInt(e.target.value))}
              className="search-filters__slider"
            />
            <span className="search-filters__value">{filters.patternSecondarySimilarity}%</span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="search-filters__section">
          <h4 className="search-filters__section-title">Categories</h4>
          
          {Object.entries(categoryOptions).map(([category, options]) => (
            <div key={category} className="search-filters__category">
              <label className="search-filters__category-label">
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </label>
              <div className="search-filters__checkboxes">
                {options.map(option => (
                  <label key={option} className="search-filters__checkbox-label">
                    <input
                      type="checkbox"
                      checked={(filters.categories[category as keyof SearchFilters["categories"]] || []).includes(option)}
                      onChange={(e) => handleCategoryChange(category as keyof SearchFilters["categories"], option, e.target.checked)}
                      className="search-filters__checkbox"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Button */}
      <div className="search-filters__footer">
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="button button--primary search-filters__search-btn"
        >
          <Search className="w-4 h-4" />
          {isSearching ? "Searching..." : "Search Similar Reports"}
        </button>
      </div>
    </div>
  );
}