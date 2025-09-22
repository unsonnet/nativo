"use client";

import Image from "next/image";

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
          <Image
            src={previewImage}
            alt={subject}
            fill
            unoptimized
            className="report-card__image"
            sizes="200px"
          />
        ) : (
          <span className="report-card__placeholder" aria-hidden />
        )}
      </figure>

      <h3 className="report-card__title">{subject}</h3>
    </article>
  );
}
