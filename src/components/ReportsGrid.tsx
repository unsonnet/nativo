"use client";

import { useEffect, useState } from "react";
import { ReportCard } from "./ReportCard";
import { listReports } from "@/lib/api/reports";
import type { ProductImage, ProductIndex, Product, ReportPreview, Report } from '@/types/report';

export function ReportsGrid() {
  const [reports, setReports] = useState<Report<ProductIndex | Product>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Load initial reports
  useEffect(() => {
    const loadReports = async () => {
      try {
        setIsLoading(true);
        const result = await listReports<ProductIndex | Product>(20);
        setReports(result.reports);
        setCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch (err) {
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
      const result = await listReports<ProductIndex | Product>(20, cursor);
      setReports(prev => [...prev, ...result.reports]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more reports');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Convert reports for dashboard view
  const dashboardReports: ReportPreview[] = reports.map((r) => {
    const ref = r.reference as ProductIndex | Product;
    // If it's a ProductIndex with an `image` string, build a ProductImage
    if ('image' in ref && typeof ref.image === 'string') {
      const pi: ProductImage = { id: ref.id, url: ref.image };
      return { ...r, reference: pi } as ReportPreview;
    }

    // If it's a Product, prefer the first image when available
    if ('images' in ref && Array.isArray(ref.images) && ref.images.length > 0) {
      return { ...r, reference: ref.images[0] } as ReportPreview;
    }

    // Fallback empty image
    return { ...r, reference: { id: ref.id, url: '' } } as ReportPreview;
  });

  if (isLoading) {
    return (
      <section className="reports-grid">
        <div className="reports-grid__loading">
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
