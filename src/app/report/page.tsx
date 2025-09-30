"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportPageContainer } from '@/components/report';

function ReportPageContent() {
  const searchParams = useSearchParams();
  const [reportId, setReportId] = useState<string | null>(null);

  useEffect(() => {
    // Get report ID from URL hash or search params
    // This handles URLs like /report#123 or /report?id=123
    // But NOT product comparison URLs like /report/product#123-productId
    const hashId = window.location.hash.slice(1);
    const paramId = searchParams.get('id');
    
    // Only use hash if it doesn't contain a hyphen (to avoid conflict with product page hashes)
    if (hashId && !hashId.includes('-')) {
      setReportId(hashId);
    } else if (paramId) {
      setReportId(paramId);
    }
  }, [searchParams]);

  if (!reportId) {
    return (
      <div className="report-create">
        <aside className="report-create__sidebar">
          <div className="report-page__error">
            <p>No report ID provided. Please access this page with a report ID.</p>
            <p>Example: /report#123 or /report?id=123</p>
          </div>
        </aside>
        <div style={{ flex: 1, background: 'var(--background)' }}></div>
      </div>
    );
  }

  return <ReportPageContainer reportId={reportId} />;
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="report-create">
        <aside className="report-create__sidebar">
          <div className="report-page__loading">
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        </aside>
        <div style={{ flex: 1, background: 'var(--background)' }}></div>
      </div>
    }>
      <ReportPageContent />
    </Suspense>
  );
}