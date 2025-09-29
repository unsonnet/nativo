"use client";

import Image from "next/image";
import Link from "next/link";

import type { Report, Product, ProductIndex, ProductImage, ReportPreview } from "@/types/report";

export function ReportCard({ report }: { report: Report<Product | ProductIndex> | ReportPreview }) {
  const { title: subject, date, reference } = report as ReportPreview | Report<Product | ProductIndex>;
  // reference may be ProductIndex (has `image`) or Product (has `images` array)
  // If this is already a ReportPreview, `reference` will be ProductImage.
  const previewImage: string | undefined =
    // ReportPreview / ProductImage case
    (reference as ProductImage).url && typeof (reference as ProductImage).url === 'string'
      ? (reference as ProductImage).url
      : // ProductIndex case
      (reference as ProductIndex).image && typeof (reference as ProductIndex).image === 'string'
      ? (reference as ProductIndex).image
      : // Product case - pick first product image's url if available
      Array.isArray((reference as Product).images) && (reference as Product).images.length > 0
      ? ((reference as Product).images[0] as ProductImage).url
      : undefined;
  const parsedDate = new Date(date);
  const formattedDate = parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link href={`/report#${report.id}`} className="report-card-link">
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
    </Link>
  );
}
