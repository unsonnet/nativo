"use client";

import { useState } from "react";
import { Search, Sliders } from "lucide-react";
import type { Product } from "@/types/report";

export interface SearchFilters {
  maxLengthDiff?: number;
  maxWidthDiff?: number;
  maxThicknessDiff?: number;
  aspectRatioTolerance?: number;
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
  
  // Determine which filters to show
  const hasLength = format?.length?.val;
  const hasWidth = format?.width?.val;
  const hasThickness = format?.thickness?.val;
  const isRelative = format?.length?.unit === 'none' || format?.width?.unit === 'none';
  
  // Aspect ratio filter only makes sense for relative dimensions (where we have an actual ratio)
  const showAspectRatioFilter = isRelative && hasLength && hasWidth;
  
  // Calculate reference aspect ratio for display
  const referenceAspectRatio = (() => {
    if (hasLength && hasWidth && format?.length?.val && format?.width?.val) {
      const ratio = format.length.val / format.width.val;
      return ratio;
    }
    return null;
  })();
  
  // Calculate tolerance range for display
  const getToleranceRange = () => {
    if (referenceAspectRatio) {
      // Use 0 as default tolerance when input is empty/undefined
      const tolerance = (filters.aspectRatioTolerance ?? 0) / 100;
      const minRatio = referenceAspectRatio * (1 - tolerance);
      const maxRatio = referenceAspectRatio * (1 + tolerance);
      return {
        min: minRatio.toFixed(2),
        max: maxRatio.toFixed(2),
        reference: referenceAspectRatio.toFixed(2),
        tolerancePercent: filters.aspectRatioTolerance ?? 0
      };
    }
    return null;
  };
  
  const [filters, setFilters] = useState<SearchFilters>({
    maxLengthDiff: 1,
    maxWidthDiff: 1,
    maxThicknessDiff: 1,
    aspectRatioTolerance: 2,
    colorPrimarySimilarity: 50,
    colorSecondarySimilarity: 50,
    patternPrimarySimilarity: 50,
    patternSecondarySimilarity: 50,
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
      maxLengthDiff: 1,
      maxWidthDiff: 1,
      maxThicknessDiff: 1,
      aspectRatioTolerance: 2,
      colorPrimarySimilarity: 50,
      colorSecondarySimilarity: 50,
      patternPrimarySimilarity: 50,
      patternSecondarySimilarity: 50,
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
        {/* Dimension Filters - conditional based on available dimensions */}
        <div className="search-filters__section">
          <h4 className="search-filters__section-title">Dimension Similarity</h4>
          
          {/* Show aspect ratio filter only for relative dimensions with both length and width */}
          {showAspectRatioFilter && (
            <div className="search-filters__field">
              <div className="search-filters__label-container">
                <label className="search-filters__label">
                  Aspect Ratio Tolerance (%)
                </label>
                {(() => {
                  const range = getToleranceRange();
                  return range ? (
                    <div className="search-filters__reference-note">
                      {range.reference} ± {range.tolerancePercent}% ({range.min} - {range.max})
                    </div>
                  ) : null;
                })()}
              </div>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={filters.aspectRatioTolerance ?? ''}
                onKeyDown={(e) => {
                  // Allow: backspace, delete, tab, escape, enter, period
                  if ([8, 9, 27, 13, 46, 110, 190].indexOf(e.keyCode) !== -1 ||
                      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                      (e.keyCode === 65 && e.ctrlKey === true) ||
                      (e.keyCode === 67 && e.ctrlKey === true) ||
                      (e.keyCode === 86 && e.ctrlKey === true) ||
                      (e.keyCode === 88 && e.ctrlKey === true) ||
                      // Allow: home, end, left, right
                      (e.keyCode >= 35 && e.keyCode <= 39)) {
                    return;
                  }
                  // Ensure that it is a number and stop the keypress
                  if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    // Allow empty value during typing
                    handleFilterChange('aspectRatioTolerance', undefined);
                  } else {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                      handleFilterChange('aspectRatioTolerance', numValue);
                    }
                  }
                }}
                onBlur={(e) => {
                  // Set default value on blur if empty
                  if (e.target.value === '' || filters.aspectRatioTolerance === undefined) {
                    handleFilterChange('aspectRatioTolerance', 2);
                  }
                }}
                className="form-control"
              />
            </div>
          )}
          
          {/* Show length filter for absolute dimensions when length is set */}
          {hasAbsoluteDimensions && hasLength && (
            <div className="search-filters__field">
              <label className="search-filters__label">
                Δ Length ({format?.length?.unit || 'in'})
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={filters.maxLengthDiff || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0 && value <= 10) {
                    handleFilterChange('maxLengthDiff', value);
                  }
                }}
                className="form-control"
                placeholder="1.0"
              />
            </div>
          )}

          {/* Show width filter for absolute dimensions when width is set */}
          {hasAbsoluteDimensions && hasWidth && (
            <div className="search-filters__field">
              <label className="search-filters__label">
                Δ Width ({format?.width?.unit || 'in'})
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={filters.maxWidthDiff || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0 && value <= 10) {
                    handleFilterChange('maxWidthDiff', value);
                  }
                }}
                className="form-control"
                placeholder="1.0"
              />
            </div>
          )}

          {/* Show thickness filter only if thickness is set */}
          {hasThickness && (
            <div className="search-filters__field">
              <label className="search-filters__label">
                Δ Depth (mm)
              </label>
              <input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={filters.maxThicknessDiff || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0 && value <= 20) {
                    handleFilterChange('maxThicknessDiff', value);
                  }
                }}
                className="form-control"
                placeholder="1.0"
              />
            </div>
          )}
        </div>

        {/* Color Similarity */}
        <div className="search-filters__section">
          <h4 className="search-filters__section-title">Color Similarity</h4>
          
          <div className="search-filters__field search-filters__field--vertical">
            <div className="slider-label-row">
              <label className="search-filters__label">Primary</label>
              <span className="slider-value">{filters.colorPrimarySimilarity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.colorPrimarySimilarity}
              onChange={(e) => handleFilterChange('colorPrimarySimilarity', parseInt(e.target.value))}
              className="slider-control"
            />
          </div>

          <div className="search-filters__field search-filters__field--vertical">
            <div className="slider-label-row">
              <label className="search-filters__label">Secondary</label>
              <span className="slider-value">{filters.colorSecondarySimilarity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.colorSecondarySimilarity}
              onChange={(e) => handleFilterChange('colorSecondarySimilarity', parseInt(e.target.value))}
              className="slider-control"
            />
          </div>
        </div>

        {/* Pattern Similarity */}
        <div className="search-filters__section">
          <h4 className="search-filters__section-title">Pattern Similarity</h4>
          
          <div className="search-filters__field search-filters__field--vertical">
            <div className="slider-label-row">
              <label className="search-filters__label">Primary</label>
              <span className="slider-value">{filters.patternPrimarySimilarity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.patternPrimarySimilarity}
              onChange={(e) => handleFilterChange('patternPrimarySimilarity', parseInt(e.target.value))}
              className="slider-control"
            />
          </div>

          <div className="search-filters__field search-filters__field--vertical">
            <div className="slider-label-row">
              <label className="search-filters__label">Secondary</label>
              <span className="slider-value">{filters.patternSecondarySimilarity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.patternSecondarySimilarity}
              onChange={(e) => handleFilterChange('patternSecondarySimilarity', parseInt(e.target.value))}
              className="slider-control"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="search-filters__section">
          <h4 className="search-filters__section-title">Categories</h4>
          
          {Object.entries(categoryOptions).map(([category, options]) => (
            <div key={category} className="search-filters__field search-filters__field--vertical">
              <label className="search-filters__label">
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </label>
              <div className="checkbox-group">
                {options.map(option => (
                  <label key={option} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={(filters.categories[category as keyof SearchFilters["categories"]] || []).includes(option)}
                      onChange={(e) => handleCategoryChange(category as keyof SearchFilters["categories"], option, e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-custom"></span>
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
          {isSearching ? "Searching..." : "Search Similar Products"}
        </button>
      </div>
    </div>
  );
}