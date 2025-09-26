import type { Report, Product, ProductIndex } from '@/types/report';

// Simple in-memory store for development. Replace with real REST API calls later.
const store: Report<Product | ProductIndex>[] = [];

export async function createReport<T extends Product | ProductIndex = Product | ProductIndex>(reportPartial: Omit<Report<T>, 'id' | 'date'>): Promise<Report<T>> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 200));

  // Do NOT generate ids here — server should assign ids. Return payload with an empty id
  const newReportBase: Report<Product | ProductIndex> = {
    id: '',
    date: new Date().toISOString(),
    ...reportPartial,
  } as Report;

  // store as base union type and cast on return
  store.unshift(newReportBase as Report<Product | ProductIndex>);
  console.log(newReportBase);

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

export const reportsApi = { createReport, listReports, getReport };
