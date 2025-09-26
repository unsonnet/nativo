import { ReportCard } from "./ReportCard";
import { reports } from "@/data/reports";
import type { ProductImage, ProductIndex, Product, ReportPreview } from '@/types/report';

export function ReportsGrid() {
  // Convert stored reports (ProductIndex/Product) into a dashboard view where
  // each report.reference is a ProductImage for easy previewing.
  const dashboardReports: ReportPreview[] = reports.map((r) => {
    const ref = r.reference as ProductIndex | Product;
    // If it's a ProductIndex with an `image` string, build a ProductImage
    if ('image' in ref && typeof ref.image === 'string') {
      const pi: ProductImage = { id: ref.id, url: ref.image };
  return { ...r, reference: pi } as ReportPreview;
    }

    // If it's a Product, prefer the first image when available
    if ('images' in ref && Array.isArray(ref.images) && ref.images.length > 0) {
  return { ...r, reference: ref.images[0] } as ReportPreview;
    }

    // Fallback empty image
  return { ...r, reference: { id: ref.id, url: '' } } as ReportPreview;
  });

  return (
    <section className="reports-grid">
      <div className="reports-grid__list">
        {dashboardReports.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </div>
    </section>
  );
}
