"use client";

import { useEffect, useState } from "react";
import type { Report, Product, ProductIndex } from "@/types/report";
import { reportsApi } from "@/lib/api/reports";
import { mockSearchResults, simulateApiDelay } from "@/data/mockSearchResults";
import type { SearchFilters as SearchFiltersType } from "./SearchFilters";

interface UseReportDataProps {
  reportId: string;
}

interface UseReportDataReturn {
  report: Report<Product> | null;
  isLoading: boolean;
  error: string | null;
  searchResults: ProductIndex[];
  isSearching: boolean;
  handleSearch: (filters: SearchFiltersType) => Promise<void>;
}

export function useReportData({ reportId }: UseReportDataProps): UseReportDataReturn {
  const [report, setReport] = useState<Report<Product> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ProductIndex[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const handleSearch = async (filters: SearchFiltersType) => {
    setIsSearching(true);
    console.log("Searching with filters:", filters);
    
    try {
      // Mock search results - in real implementation, this would call your search API
      await simulateApiDelay(1000); // Simulate API call
      
      setSearchResults(mockSearchResults);
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
    handleSearch
  };
}