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
    const hashId = window.location.hash.slice(1);
    const paramId = searchParams.get('id');
    
    if (hashId) {
      setReportId(hashId);
    } else if (paramId) {
      setReportId(paramId);
    }
  }, [searchParams]);

  if (!reportId) {
    return (
      <div className="report-page">
        <div className="report-page__error">
          <p>No report ID provided. Please access this page with a report ID.</p>
          <p>Example: /report#123 or /report?id=123</p>
          <a href="/dashboard" className="button button--secondary">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <ReportPageContainer reportId={reportId} />;
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportPageContent />
    </Suspense>
  );
}