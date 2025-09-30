"use client";

import { useSearchParams } from "next/navigation";
import { 
  ReportInfoHeader, 
  ImageGallery, 
  SearchFilters, 
  SearchResults 
} from "@/components/report";
import { ProductComparisonContainer } from "@/components/product/ProductComparisonContainer";
import { useReportData } from "./useReportData";

interface ReportPageContainerProps {
  reportId: string;
}

export function ReportPageContainer({ reportId }: ReportPageContainerProps) {
  const searchParams = useSearchParams();
  const queryReportId = searchParams.get('report');
  const productId = searchParams.get('product');
  
  // Use the report ID from query params if available, otherwise use the prop
  const activeReportId = queryReportId || reportId;
  
  console.log('🔍 ReportPageContainer state:', { 
    propReportId: reportId,
    queryReportId,
    activeReportId,
    productId,
    currentURL: typeof window !== 'undefined' ? window.location.href : 'SSR',
    searchParamsString: searchParams.toString()
  });
  
  const {
    report,
    isLoading,
    error,
    searchResults,
    isSearching,
    hasSearched,
    handleSearch,
    initialFavorites
  } = useReportData({ reportId: activeReportId });

  // If we have a product parameter, show product comparison instead
  if (productId && report) {
    console.log('🎯 Switching to product comparison view:', { reportId: activeReportId, productId });
    return (
      <ProductComparisonContainer 
        reportId={activeReportId} 
        productId={productId} 
      />
    );
  }

  if (isLoading) {
    return (
      <div className="report-create">
        <aside className="report-create__sidebar">
          <div className="report-create__form">
            <div className="report-form">
              <div className="report-form__body">
                <div className="report-page__loading">
                  <div className="loading-spinner"></div>
                  <p>Loading report...</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
        <div style={{ flex: 1, background: 'var(--background)' }}></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="report-create">
        <aside className="report-create__sidebar">
          <div className="report-create__form">
            <div className="report-form">
              <div className="report-form__body">
                <div className="report-page__error">
                  <p>{error || "Report not found"}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
        <div style={{ flex: 1, background: 'var(--background)' }}></div>
      </div>
    );
  }

  return (
    <div className="report-create">
      {/* Left sidebar with gallery and filters */}
      <aside className="report-create__sidebar">
        <div className="report-create__form">
          <div className="report-form">
              {/* Image Gallery */}
              <ImageGallery images={report.reference.images} />
              
            <div className="report-form__body">
              {/* Search Filters */}
              <SearchFilters 
                referenceProduct={report.reference}
                onSearch={handleSearch}
                isSearching={isSearching}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Right content area with report info header and search results */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Report information strip spans the full width */}
        <ReportInfoHeader report={report} />
        
        {/* Search Results */}
        <SearchResults 
          results={searchResults}
          isLoading={isSearching}
          hasSearched={hasSearched}
          reportId={activeReportId}
          referenceProduct={report.reference}
          initialFavorites={initialFavorites}
        />
      </main>
    </div>
  );
}