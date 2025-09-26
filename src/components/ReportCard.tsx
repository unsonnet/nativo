"use client";

import Image from "next/image";

import type { Report } from "@/types/report";

export function ReportCard({ report }: { report: Report }) {
  const { title: subject, date, reference } = report;
  // reference may be ProductIndex (has `image`) or Product (has `images` array)
  const previewImage: string | undefined =
    // ProductIndex case
    "image" in reference && typeof reference.image === "string"
      ? reference.image
      : // Product case - pick first product image's url if available
      "images" in reference && Array.isArray(reference.images) && reference.images.length > 0
      ? reference.images[0].url
      : undefined;
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
