"use client";

import { useEffect, useState } from "react";
import type { Report, Product, ProductIndex } from "@/types/report";
import { reportsApi } from "@/lib/api/reports";
import { simulateApiDelay } from "@/data/mockSearchResults";
import type { SearchFilters as SearchFiltersType } from "./SearchFilters";

// Session storage keys
const getFilterStorageKey = (reportId: string) => `report_filters_${reportId}`;
const getResultsStorageKey = (reportId: string) => `report_results_${reportId}`;
const getSearchedStorageKey = (reportId: string) => `report_searched_${reportId}`;

interface UseReportDataProps {
  reportId: string;
}

interface UseReportDataReturn {
  report: Report<Product> | null;
  isLoading: boolean;
  error: string | null;
  searchResults: ProductIndex[];
  isSearching: boolean;
  hasSearched: boolean;
  handleSearch: (filters: SearchFiltersType) => Promise<void>;
  /** Initial favorites from the database (for useFavorites initialization) */
  initialFavorites: string[];
  /** Current search filters state */
  searchFilters: SearchFiltersType | null;
  /** Update search filters */
  setSearchFilters: (filters: SearchFiltersType) => void;
}

export function useReportData({ reportId }: UseReportDataProps): UseReportDataReturn {
  const [report, setReport] = useState<Report<Product> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ProductIndex[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFiltersType | null>(null);

  // Load persisted data from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && reportId) {
      try {
        // Load persisted filters
        const storedFilters = sessionStorage.getItem(getFilterStorageKey(reportId));
        if (storedFilters) {
          setSearchFilters(JSON.parse(storedFilters));
        }

        // Load persisted search results
        const storedResults = sessionStorage.getItem(getResultsStorageKey(reportId));
        if (storedResults) {
          setSearchResults(JSON.parse(storedResults));
        }

        // Load persisted search state
        const storedSearched = sessionStorage.getItem(getSearchedStorageKey(reportId));
        if (storedSearched) {
          setHasSearched(JSON.parse(storedSearched));
        }
      } catch (error) {
        console.warn('Failed to load persisted search data:', error);
      }
    }
  }, [reportId]);

  // Persist data to sessionStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && reportId) {
      if (searchFilters) {
        sessionStorage.setItem(getFilterStorageKey(reportId), JSON.stringify(searchFilters));
      }
    }
  }, [searchFilters, reportId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && reportId) {
      sessionStorage.setItem(getResultsStorageKey(reportId), JSON.stringify(searchResults));
    }
  }, [searchResults, reportId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && reportId) {
      sessionStorage.setItem(getSearchedStorageKey(reportId), JSON.stringify(hasSearched));
    }
  }, [hasSearched, reportId]);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Use the new getFullReport function
        const foundReport = await reportsApi.getFullReport(reportId);
        
        if (!foundReport) {
          setError("Report not found");
          return;
        }

        setReport(foundReport);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setIsLoading(false);
      }
    };

    if (reportId) {
      loadReport();
    }
  }, [reportId]);

  const updateSearchFilters = (filters: SearchFiltersType) => {
    setSearchFilters(filters);
    // sessionStorage will be updated by the useEffect above
  };

  const handleSearch = async (filters: SearchFiltersType) => {
    setIsSearching(true);
    setHasSearched(true); // Mark that a search has been performed
    setSearchFilters(filters); // Store the filters used for this search
    
    try {
      if (!report) {
        console.warn("No report loaded, cannot search");
        return;
      }

      // Check if real API should be used
      const USE_REAL_API = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';
      
      if (USE_REAL_API) {
        // TODO: Use real API
        // const { reportsApiService } = await import("@/lib/api/reportsApi");
        // const response = await reportsApiService.searchProducts(report.id, {
        //   filters,
        //   page: 1,
        //   limit: 50,
        // });
        // 
        // if (response.status === 200) {
        //   setSearchResults(response.body.products);
        // } else {
        //   console.error("Search failed:", response.error);
        // }
        
        console.log('[API] Real API enabled but not implemented yet, using mock');
      }

      // Mock search results - in real implementation, this would call your search API
      await simulateApiDelay(1000); // Simulate API call
      
      // Get search results specific to this report and its reference product
      const { getMockSearchResults } = await import("@/data/mockSearchResults");
      const resultsForReport = getMockSearchResults(report.id, report.reference.id);
      
      // Return a random subset of results (0 to all results) to simulate filtering
      const totalResults = resultsForReport.length;
      const randomCount = Math.floor(Math.random() * (totalResults + 1)); // 0 to totalResults inclusive
      
      // Shuffle the array and take the first randomCount items
      const shuffled = [...resultsForReport].sort(() => Math.random() - 0.5);
      const randomResults = shuffled.slice(0, randomCount);
      
      setSearchResults(randomResults);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return {
    report,
    isLoading,
    error,
    searchResults,
    isSearching,
    hasSearched,
    handleSearch,
    initialFavorites: report?.favorites || [],
    searchFilters,
    setSearchFilters: updateSearchFilters
  };
}