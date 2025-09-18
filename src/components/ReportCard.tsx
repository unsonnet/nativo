"use client";

import type { Report } from "@/types/report";

export function ReportCard({ report }: { report: Report }) {
  const { subject, date, reference } = report;
  const previewImage = reference.images[0];
  const parsedDate = new Date(date);
  const formattedDate = parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="report-card" aria-label={subject}>
      <time className="report-card__date" dateTime={parsedDate.toISOString()}>
        {formattedDate}
      </time>

      <figure className="report-card__media">
        {previewImage ? (
          <img src={previewImage} alt={subject} className="report-card__image" />
        ) : (
          <span className="report-card__placeholder" aria-hidden />
        )}
      </figure>

      <h3 className="report-card__title">{subject}</h3>
    </article>
  );
}
