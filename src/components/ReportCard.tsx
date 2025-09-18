"use client";

import type { Report } from "@/types/report";

export function ReportCard({ report }: { report: Report }) {
  const { subject, date, reference } = report;
  const previewImage = reference.images[0];

  return (
    <div className="group cursor-pointer">
      <div className="bg-card/5 backdrop-blur-sm rounded-lg p-4 shadow-sm hover:shadow-md hover:bg-card/10 transition-all duration-200">
        <div className="space-y-3">
          {/* Date */}
          <p className="text-xs text-muted-foreground">
            {new Date(date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          {/* Image */}
          <div className="aspect-square w-full overflow-hidden rounded-md bg-muted/10">
            {previewImage ? (
              <img
                src={previewImage}
                alt={subject}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="h-full w-full bg-gray-700" />
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-foreground truncate">
            {subject}
          </h3>
        </div>
      </div>
    </div>
  );
}
