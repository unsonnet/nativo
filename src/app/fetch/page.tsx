"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ReportPageContainer } from "@/components/report/ReportPageContainer";

function FetchPageContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('report');

  if (!reportId) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <h2>Search ID Required</h2>
        <p>Please provide a search ID in the URL: /fetch?report=YOUR_SEARCH_ID</p>
      </div>
    );
  }

  return <ReportPageContainer reportId={reportId} />;
}

export default function FetchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FetchPageContent />
    </Suspense>
  );
}