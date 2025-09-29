"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
      <div className="report-page">
        <div className="report-page__loading">
          <div className="loading-spinner"></div>
          <p>Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="report-page">
        <div className="report-page__error">
          <p>{error || "Report not found"}</p>
          <Link href="/dashboard" className="button button--secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      {/* Header with back button and report info */}
      <header className="report-page__header">
        <Link href="/dashboard" className="report-page__back-button">
          <ArrowLeft className="w-5 h-5" />
          Back to Reports
        </Link>
        <h1 className="report-page__title">Report Details & Search</h1>
      </header>

      {/* Report information strip */}
      <ReportInfoHeader report={report} />

      {/* Main content area */}
      <div className="report-page__content">
        {/* Left sidebar with gallery and filters */}
        <aside className="report-page__sidebar">
          <ImageGallery images={report.reference.images} />
          <SearchFilters 
            referenceProduct={report.reference}
            onSearch={handleSearch}
            isSearching={isSearching}
          />
        </aside>

        {/* Right content area for search results */}
        <main className="report-page__main">
          <SearchResults 
            results={searchResults}
            isLoading={isSearching}
            referenceProduct={report.reference}
          />
        </main>
      </div>
    </div>
  );
}