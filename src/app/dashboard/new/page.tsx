'use client';

import { useRouter } from 'next/navigation';

import { ImageWorkspace } from '@/components/ImageWorkspace';
import { NewReportForm } from '@/components/NewReportForm';
import { useState } from 'react';

export default function NewReportPage() {
  const router = useRouter();
  const [gridEnabled, setGridEnabled] = useState(false);

  return (
    <div className="report-create">
      <aside className="report-create__sidebar">
        <button
          type="button"
          className="report-create__back"
          onClick={() => router.push('/dashboard')}
        >
          <span aria-hidden className="report-create__back-icon">←</span>
          Back to Reports
        </button>

        <div className="report-create__form">
          <NewReportForm onDimensionsChange={(v) => setGridEnabled(v)} />
        </div>
      </aside>

      <ImageWorkspace gridEnabled={gridEnabled} />
    </div>
  );
}

