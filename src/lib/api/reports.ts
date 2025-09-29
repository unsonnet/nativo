import type { Report, Product, ProductIndex } from '@/types/report';
import { reports as mockReports } from '@/data/reports';

// Simple in-memory store for development. Replace with real REST API calls later.
const store: Report<Product | ProductIndex>[] = [...mockReports];

export async function createReport<T extends Product | ProductIndex = Product | ProductIndex>(reportPartial: Omit<Report<T>, 'id' | 'date'>): Promise<Report<T>> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 200));

  // Generate a simple ID for demo purposes
  const newId = (store.length + 1).toString();
  const newReportBase: Report<Product | ProductIndex> = {
    id: newId,
    date: new Date().toISOString(),
    ...reportPartial,
  } as Report;

  // store as base union type and cast on return
  store.unshift(newReportBase as Report<Product | ProductIndex>);
  console.log('Created report:', newReportBase);

  // In a real implementation you would POST to your REST API and return server response
  return newReportBase as unknown as Report<T>;
}

export async function listReports<T extends Product | ProductIndex = Product | ProductIndex>(): Promise<Report<T>[]> {
  await new Promise((r) => setTimeout(r, 60));
  return store.slice() as Report<T>[];
}

export async function getReport<T extends Product | ProductIndex = Product | ProductIndex>(id: string): Promise<Report<T> | undefined> {
  await new Promise((r) => setTimeout(r, 60));
  return store.find((r) => r.id === id) as Report<T> | undefined;
}

// Helper function to transform ProductIndex to full Product for detail view
export async function getFullReport(id: string): Promise<Report<Product> | undefined> {
  await new Promise((r) => setTimeout(r, 60));
  const foundReport = store.find((r) => r.id === id);
  
  if (!foundReport) {
    return undefined;
  }

  // If it's already a Product report, return as-is
  if ('images' in foundReport.reference && Array.isArray(foundReport.reference.images)) {
    return foundReport as Report<Product>;
  }

  // Transform ProductIndex to Product
  const productIndex = foundReport.reference as ProductIndex;
  const mockImages = [
    {
      id: productIndex.id + "_img1",
      url: productIndex.image || "https://picsum.photos/seed/report1/800/800",
    },
    {
      id: productIndex.id + "_img2", 
      url: "https://picsum.photos/seed/report2/800/800",
    },
    {
      id: productIndex.id + "_img3",
      url: "https://picsum.photos/seed/report3/800/800",
    },
    {
      id: productIndex.id + "_img4",
      url: "https://picsum.photos/seed/report4/800/800",
    },
    {
      id: productIndex.id + "_img5",
      url: "https://picsum.photos/seed/report5/800/800",
    }
  ];

  const fullProduct: Product = {
    id: productIndex.id,
    brand: productIndex.brand || "Premium Floors",
    series: productIndex.series || "Executive Collection",
    model: productIndex.model || "Classic Oak",
    images: mockImages,
    category: {
      type: "Hardwood",
      material: "Oak",
      look: "Traditional",
      texture: "Smooth",
      finish: "Matte",
      edge: "Beveled"
    },
    formats: [
      {
        length: { val: 25, unit: "in" as const },
        width: { val: 18, unit: "in" as const },
        thickness: { val: 12, unit: "mm" as const },
        vendors: [
          {
            sku: "OAK-2518-12",
            store: "FloorMart",
            name: "Premium Oak Hardwood",
            price: { val: 4.99, unit: "usd" as const },
            discontinued: false,
            url: "https://example.com/product"
          }
        ]
      }
    ],
    analysis: productIndex.analysis ? {
      color: {
        primary: [0.8, 0.6, 0.4, 0.9, 0.7], // Expand mini-embedding
        secondary: [0.7, 0.5, 0.3, 0.8, 0.6]
      },
      pattern: {
        primary: [0.6, 0.4, 0.8, 0.7, 0.5],
        secondary: [0.5, 0.3, 0.7, 0.6, 0.4]
      },
      similarity: productIndex.analysis.similarity
    } : undefined
  };

  return {
    ...foundReport,
    reference: fullProduct
  } as Report<Product>;
}

export const reportsApi = { createReport, listReports, getReport, getFullReport };
