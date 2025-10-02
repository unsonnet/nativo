/**
 * Reports API Service - Updated to use Original API Adapter
 * This file now bridges between the existing React app interface and the original API
 */

import type { Report, Product, ProductIndex } from '@/types/report';
import { reports as mockReports } from '@/data/reports';
import { getProductWithAnalysis } from '@/data/mockDatabase';
import { reportsApiService } from './reportsApi';

// Simple in-memory store for development. Will be replaced by real API calls.
const store: Report<Product | ProductIndex>[] = [...mockReports];

// Enable real API by default now that adapters are in place
const USE_REAL_API = process.env.NEXT_PUBLIC_USE_REAL_API !== 'false';

export async function createReport<T extends Product | ProductIndex = Product | ProductIndex>(
  reportPartial: Omit<Report<T>, 'id' | 'date'>
): Promise<Report<T>> {
  if (USE_REAL_API) {
    try {
      const response = await reportsApiService.createReport({
        title: reportPartial.title,
        reference: reportPartial.reference as Product,
      });
      
      if (response.status === 201) {
        // Get the full report details
        const fullReportResponse = await reportsApiService.getReport(response.body.id);
        if (fullReportResponse.status === 200) {
          return fullReportResponse.body as Report<T>;
        }
      }
      
      throw new Error(response.error || 'Failed to create report');
    } catch (error) {
      console.error('[API] Error creating report:', error);
      console.log('[API] Falling back to mock implementation');
    }
  }

  // Mock implementation
  await new Promise((r) => setTimeout(r, 200));

  const newId = (store.length + 1).toString();
  const newReportBase: Report<Product | ProductIndex> = {
    id: newId,
    date: new Date().toISOString(),
    ...reportPartial,
  } as Report;

  store.unshift(newReportBase as Report<Product | ProductIndex>);

  return newReportBase as unknown as Report<T>;
}

export async function listReports<T extends Product | ProductIndex = Product | ProductIndex>(
  limit: number = 20, 
  cursor?: string
): Promise<{ reports: Report<T>[]; nextCursor?: string; hasMore: boolean }> {
  if (USE_REAL_API) {
    try {
      const response = await reportsApiService.listReports(limit, cursor);
      if (response.status === 200) {
        return {
          reports: response.body.reports as Report<T>[],
          nextCursor: response.body.next_cursor || undefined,
          hasMore: response.body.has_more
        };
      }
      throw new Error(response.error || 'Failed to list reports');
    } catch (error) {
      console.error('[API] Error listing reports:', error);
      console.log('[API] Falling back to mock implementation');
    }
  }

  // Mock implementation - simulate cursor pagination
  await new Promise((r) => setTimeout(r, 60));
  const allReports = store.slice() as Report<T>[];
  
  // Simple cursor simulation for mock
  const startIndex = cursor ? parseInt(cursor) || 0 : 0;
  const endIndex = startIndex + limit;
  const reports = allReports.slice(startIndex, endIndex);
  const hasMore = endIndex < allReports.length;
  const nextCursor = hasMore ? endIndex.toString() : undefined;
  
  return { reports, nextCursor, hasMore };
}

export async function getReport<T extends Product | ProductIndex = Product | ProductIndex>(
  id: string
): Promise<Report<T> | undefined> {
  if (USE_REAL_API) {
    try {
      const response = await reportsApiService.getReport(id);
      if (response.status === 200) {
        return response.body as Report<T>;
      }
      if (response.status === 404) {
        return undefined;
      }
      throw new Error(response.error || 'Failed to get report');
    } catch (error) {
      console.error('[API] Error getting report:', error);
      console.log('[API] Falling back to mock implementation');
    }
  }

  // Mock implementation
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

  // Transform ProductIndex to Product using our mock database
  const productIndex = foundReport.reference as ProductIndex;
  
  // Get the full product with analysis from our mock database
  const fullProduct = getProductWithAnalysis(productIndex.id, foundReport.id);
  
  if (!fullProduct) {
    // Fallback to the original mock behavior if product not found in database
    console.warn(`Product ${productIndex.id} not found in mock database, using fallback`);
    
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

    const fallbackProduct: Product = {
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
          primary: { 
            vector: [0.8, 0.6, 0.4, 0.9, 0.7], // Expand mini-embedding
            similarity: productIndex.analysis.color.primary.similarity 
          },
          secondary: { 
            vector: [0.7, 0.5, 0.3, 0.8, 0.6],
            similarity: productIndex.analysis.color.secondary.similarity 
          }
        },
        pattern: {
          primary: { 
            vector: [0.6, 0.4, 0.8, 0.7, 0.5],
            similarity: productIndex.analysis.pattern.primary.similarity 
          },
          secondary: { 
            vector: [0.5, 0.3, 0.7, 0.6, 0.4],
            similarity: productIndex.analysis.pattern.secondary.similarity 
          }
        },
        similarity: productIndex.analysis.similarity
      } : undefined
    };
    
    return {
      ...foundReport,
      reference: fallbackProduct
    } as Report<Product>;
  }

  return {
    ...foundReport,
    reference: fullProduct
  } as Report<Product>;
}

export const reportsApi = { createReport, listReports, getReport, getFullReport };
