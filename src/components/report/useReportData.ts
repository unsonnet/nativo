"use client";

import { useEffect, useState } from "react";
import type { Report, Product, ProductIndex } from "@/types/report";
import { reportsApi } from "@/lib/api/reports";
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
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      const mockResults: ProductIndex[] = [
        {
          id: "search_result_1",
          brand: "TimberCraft",
          series: "Artisan Series",
          model: "Classic Oak Heritage",
          image: "https://picsum.photos/seed/result1/400/400",
          analysis: {
            color: { primary: [0.8, 0.6], secondary: [0.7, 0.5] },
            pattern: { primary: [0.9, 0.7], secondary: [0.8, 0.6] },
            similarity: 0.92
          }
        },
        {
          id: "search_result_2", 
          brand: "WoodWorks",
          series: "Heritage Collection",
          model: "Rustic Oak Plank",
          image: "https://picsum.photos/seed/result2/400/400",
          analysis: {
            color: { primary: [0.7, 0.5], secondary: [0.6, 0.4] },
            pattern: { primary: [0.8, 0.6], secondary: [0.7, 0.5] },
            similarity: 0.89
          }
        },
        {
          id: "search_result_3",
          brand: "FloorMaster",
          series: "Executive Line",
          model: "Golden Oak Select",
          image: "https://picsum.photos/seed/result3/400/400",
          analysis: {
            color: { primary: [0.9, 0.7], secondary: [0.8, 0.6] },
            pattern: { primary: [0.85, 0.65], secondary: [0.75, 0.55] },
            similarity: 0.87
          }
        },
        {
          id: "search_result_4",
          brand: "NaturalCraft",
          series: "Vintage Collection",
          model: "Antique Oak Wide Plank",
          image: "https://picsum.photos/seed/result4/400/400",
          analysis: {
            color: { primary: [0.75, 0.55], secondary: [0.65, 0.45] },
            pattern: { primary: [0.9, 0.7], secondary: [0.8, 0.6] },
            similarity: 0.84
          }
        },
        {
          id: "search_result_5",
          brand: "Premier Flooring",
          series: "Signature Series", 
          model: "European Oak Classic",
          image: "https://picsum.photos/seed/result5/400/400",
          analysis: {
            color: { primary: [0.85, 0.65], secondary: [0.75, 0.55] },
            pattern: { primary: [0.88, 0.68], secondary: [0.78, 0.58] },
            similarity: 0.91
          }
        }
      ];
      
      setSearchResults(mockResults);
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