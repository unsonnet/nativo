import { ReportPageContainer } from '@/components/report';

// Required for static export with dynamic routes
export async function generateStaticParams() {
  // For static export, we need to pre-generate paths
  // You can return an empty array for now, or include known report IDs
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' },
    { id: 'new' }, // For newly created reports
  ];
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportPageContainer reportId={id} />;
}