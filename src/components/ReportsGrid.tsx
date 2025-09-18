import { ReportCard } from "./ReportCard";
import { reports } from "@/data/reports";

export function ReportsGrid() {
  return (
    <div className="w-full px-8 py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {reports.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </div>
    </div>
  );
}
