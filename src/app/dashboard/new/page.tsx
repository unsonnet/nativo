'use client';

import { useRouter } from 'next/navigation';

import { NewReportForm } from '@/components/NewReportForm';

export default function NewReportPage() {
  const router = useRouter();

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
          <NewReportForm />
        </div>
      </aside>

      <section className="report-create__canvas">
        <div className="report-create__dropzone" role="presentation">
          <svg
            className="report-create__dropzone-icon"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M24 32V12m0 0-7 7m7-7 7 7"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <path
              d="M16 36h16"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
            />
          </svg>
          <p className="report-create__dropzone-text">Drag and drop images here</p>
          <span className="report-create__dropzone-separator">or</span>
          <button type="button" className="report-create__choose">
            <span aria-hidden className="report-create__choose-icon">+</span>
            Choose Images
          </button>
        </div>
      </section>
    </div>
  );
}
