"use client";

import Link from "next/link";
import { 
  ReportInfoHeader, 
  ImageGallery, 
  SearchFilters, 
  SearchResults 
} from "@/components/report";
import { useReportData } from "./useReportData";

interface ReportPageContainerProps {
  reportId: string;
}

export function ReportPageContainer({ reportId }: ReportPageContainerProps) {
  const {
    report,
    isLoading,
    error,
    searchResults,
    isSearching,
    handleSearch
  } = useReportData({ reportId });

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
          <Link href="/dashboard" className="report-create__back">
            <span aria-hidden className="report-create__back-icon">←</span>
            Back to Reports
          </Link>
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
      {/* Left sidebar with back button, gallery and filters */}
      <aside className="report-create__sidebar">
        <Link href="/dashboard" className="report-create__back">
          <span aria-hidden className="report-create__back-icon">←</span>
          Back to Reports
        </Link>

        <div className="report-create__form">
          <div className="report-form">
            <div className="report-form__body">
              {/* Image Gallery */}
              <ImageGallery images={report.reference.images} />
              
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
          referenceProduct={report.reference}
        />
      </main>
    </div>
  );
}