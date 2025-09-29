"use client";

import { useRouter } from 'next/navigation';

import { ImageWorkspace } from '@/components/ImageWorkspace';
import { NewReportForm } from '@/components/NewReportForm';
import { packageAndCreateReport } from '@/lib/reports/service';
import { useState, useCallback } from 'react';
import type { ProductImage } from '@/types/report';

export default function CreatePage() {
  const router = useRouter();
  const [gridEnabled, setGridEnabled] = useState(false);
  const [dimensions, setDimensions] = useState<{ length: number | null; width: number | null; thickness: number | null }>({
    length: null,
    width: null,
    thickness: null,
  });
  const [imageCount, setImageCount] = useState(0);
  const [images, setImages] = useState<{ id: string; name: string; url: string; mask?: string; selection?: ProductImage['selection'] }[]>([]);

  const handleDimensionsChange = useCallback((v: boolean) => setGridEnabled(v), []);
  const handleDimensionsValues = useCallback(
    (vals: { length: number | null; width: number | null; thickness: number | null }) => setDimensions(vals),
    []
  );

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
          <NewReportForm
            onDimensionsChange={handleDimensionsChange}
            onDimensionsValues={handleDimensionsValues}
            imageCount={imageCount}
            onSubmit={async (form) => {
              try {
                const createdReport = await packageAndCreateReport(form, images);
                // Redirect to the new report page instead of dashboard
                router.push(`/report#${createdReport.id || 'new'}`);
              } catch (err) {
                console.error('Failed to create report', err);
              }
            }}
          />
        </div>
      </aside>

      <ImageWorkspace
        gridEnabled={gridEnabled}
        dimensions={dimensions}
        onImagesChange={setImageCount}
        onImages={setImages}
      />
    </div>
  );
}
