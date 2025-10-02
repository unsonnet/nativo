"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { ReportCard } from "./ReportCard";
import { listReports } from "@/lib/api/reports";
import type { ProductImage, ProductIndex, Product, ReportPreview, Report } from '@/types/report';

export function ReportsGrid() {
  const [reports, setReports] = useState<Report<ProductIndex>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const hasLoadedRef = useRef(false);
  const router = useRouter();

  // Load initial reports
  useEffect(() => {
    const loadReports = async () => {
      // Prevent duplicate calls in Strict Mode
      if (hasLoadedRef.current) {
        return;
      }
      
      try {
        hasLoadedRef.current = true;
        setIsLoading(true);
        const result = await listReports(20);
        setReports(result.reports);
        setCursor(result.nextCursor || undefined);
        setHasMore(result.hasMore);
      } catch (err) {
        hasLoadedRef.current = false; // Reset on error so it can retry
        setError(err instanceof Error ? err.message : 'Failed to load reports');
      } finally {
        setIsLoading(false);
      }
    };

    loadReports();
  }, []);

  // Load more reports (cursor pagination)
  const loadMoreReports = async () => {
    if (!hasMore || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      const result = await listReports(20, cursor);
      setReports(prev => [...prev, ...result.reports]);
      setCursor(result.nextCursor || undefined);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more reports');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Convert reports for dashboard view
  const dashboardReports: ReportPreview[] = reports.map((r) => {
    const ref = r.reference; // ProductIndex with image property
    const pi: ProductImage = { id: ref.id, url: ref.image };
    return { ...r, reference: pi } as ReportPreview;
  });

  const handleCreateReport = () => {
    router.push('/create');
  };

  if (isLoading) {
    return (
      <section className="reports-grid">
        <div className="report-page__loading">
          <div className="loading-spinner"></div>
          <p>Loading reports...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="reports-grid">
        <div className="reports-grid__error">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </section>
    );
  }

  // Show empty state when no reports
  if (reports.length === 0) {
    return (
      <section className="reports-grid">
        <div className="reports-grid__empty">
          <FileText className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No reports yet</h3>
          <p className="text-gray-600 mb-6 text-center max-w-md">
            Get started by creating your first report. Upload an image and we'll help you find similar products.
          </p>
          <button 
            onClick={handleCreateReport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Report
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="reports-grid">
      <div className="reports-grid__list">
        {dashboardReports.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </div>
      
      {hasMore && (
        <div className="reports-grid__load-more">
          <button 
            onClick={loadMoreReports} 
            disabled={isLoadingMore}
            className="load-more-button"
          >
            {isLoadingMore ? 'Loading...' : 'Load More Reports'}
          </button>
        </div>
      )}
    </section>
  );
}
