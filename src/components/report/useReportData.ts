"use client";

import { useEffect, useState } from "react";
import type { Report, Product } from "@/types/report";
import { reportsApi } from "@/lib/api/reports";
import type { SearchFilters as SearchFiltersType } from "./SearchFilters";

interface UseReportDataProps {
  reportId: string;
}

interface UseReportDataReturn {
  report: Report<Product> | null;
  isLoading: boolean;
  error: string | null;
  searchResults: Product[];
  isSearching: boolean;
  handleSearch: (filters: SearchFiltersType) => Promise<void>;
}

export function useReportData({ reportId }: UseReportDataProps): UseReportDataReturn {
  const [report, setReport] = useState<Report<Product> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
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
      
      const mockResults: Product[] = [
        {
          id: "search_result_1",
          brand: "TimberCraft",
          series: "Artisan Series",
          model: "Classic Oak Heritage",
          images: [{ id: "img1", url: "https://picsum.photos/seed/result1/400/400" }],
          category: {
            type: "Hardwood",
            material: "Oak",
            look: "Traditional",
            texture: "Hand-scraped",
            finish: "Satin"
          },
          formats: [
            {
              length: { val: 24, unit: "in" as const },
              width: { val: 17, unit: "in" as const },
              thickness: { val: 11, unit: "mm" as const },
              vendors: []
            }
          ]
        },
        {
          id: "search_result_2", 
          brand: "WoodWorks",
          series: "Heritage Collection",
          model: "Rustic Oak Plank",
          images: [{ id: "img2", url: "https://picsum.photos/seed/result2/400/400" }],
          category: {
            type: "Hardwood",
            material: "Oak",
            look: "Rustic",
            texture: "Wire-brushed",
            finish: "Matte"
          },
          formats: [
            {
              length: { val: 26, unit: "in" as const },
              width: { val: 19, unit: "in" as const },
              thickness: { val: 13, unit: "mm" as const },
              vendors: []
            }
          ]
        },
        {
          id: "search_result_3",
          brand: "FloorMaster",
          series: "Executive Line",
          model: "Golden Oak Select",
          images: [{ id: "img3", url: "https://picsum.photos/seed/result3/400/400" }],
          category: {
            type: "Hardwood",
            material: "Oak",
            look: "Contemporary",
            texture: "Smooth",
            finish: "Semi-gloss"
          },
          formats: [
            {
              length: { val: 25, unit: "in" as const },
              width: { val: 18, unit: "in" as const },
              thickness: { val: 12, unit: "mm" as const },
              vendors: []
            }
          ]
        },
        {
          id: "search_result_4",
          brand: "NaturalCraft",
          series: "Vintage Collection",
          model: "Antique Oak Wide Plank",
          images: [{ id: "img4", url: "https://picsum.photos/seed/result4/400/400" }],
          category: {
            type: "Hardwood",
            material: "Oak",
            look: "Traditional",
            texture: "Distressed",
            finish: "Natural"
          },
          formats: [
            {
              length: { val: 27, unit: "in" as const },
              width: { val: 20, unit: "in" as const },
              thickness: { val: 14, unit: "mm" as const },
              vendors: []
            }
          ]
        },
        {
          id: "search_result_5",
          brand: "Premier Flooring",
          series: "Signature Series",
          model: "European Oak Classic",
          images: [{ id: "img5", url: "https://picsum.photos/seed/result5/400/400" }],
          category: {
            type: "Hardwood",
            material: "Oak",
            look: "Modern",
            texture: "Smooth",
            finish: "Gloss"
          },
          formats: [
            {
              length: { val: 23, unit: "in" as const },
              width: { val: 16, unit: "in" as const },
              thickness: { val: 10, unit: "mm" as const },
              vendors: []
            }
          ]
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