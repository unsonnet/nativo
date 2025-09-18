import { ReportCard } from "./ReportCard";
import { reports } from "@/data/reports";

export function ReportsGrid() {
  return (
    <section className="reports-grid">
      <div className="reports-grid__list">
        {reports.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </div>
    </section>
  );
}
