"use client";

import { useSearchParams } from "next/navigation";
import { ReportPageContainer } from "@/components/report/ReportPageContainer";

export default function FetchPage() {
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
        <h2>Report ID Required</h2>
        <p>Please provide a report ID in the URL: /fetch?report=YOUR_REPORT_ID</p>
      </div>
    );
  }

  return <ReportPageContainer reportId={reportId} />;
}