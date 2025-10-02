/**
 * Reports API Service - Bridge Layer
 * This file bridges between the existing React interface and the new API adapter
 */

import type { Report, Product, ProductIndex } from '@/types/report';
import { reports } from '@/data/reports';
import { ReportsApiService } from './reportsApi';

// Check if we should use real API
const USE_REAL_API = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';

// Helper function to transform ProductIndex to full Product for detail view
export async function getFullReport(id: string, caller?: string): Promise<Report<Product> | undefined> {
  if (USE_REAL_API) {
    console.log(`[API] getFullReport called by: ${caller || 'unknown'} for id: ${id}`);
    
    try {
      const response = await ReportsApiService.getReport(id);
      if (response.status === 200) {
        return response.body;
      }
      if (response.status === 404) {
        return undefined;
      }
      throw new Error(response.error || 'Failed to get report');
    } catch (error) {
      console.error('[API] Error getting full report:', error);
      console.log('[API] Falling back to mock implementation');
    }
  }

  // Mock implementation fallback
  await new Promise((r) => setTimeout(r, 60));
  const foundReport = reports.find((r: Report<ProductIndex>) => r.id === id);
  
  if (!foundReport) {
    return undefined;
  }

  // For mock data, we need to transform ProductIndex to Product
  // This is a simplified conversion for fallback
  return foundReport as unknown as Report<Product>;
}

// Create report function
export async function createReport(title: string, reference: Product): Promise<string> {
  if (USE_REAL_API) {
    console.log('[API] Creating report with title:', title);
    console.log('[API] Reference product:', reference.id, reference.model);
    console.log('[API] Images to upload:', reference.images.length);
    
    const response = await ReportsApiService.createReport({ title, reference });
    
    console.log('[API] Create report response status:', response.status);
    if (response.error) {
      console.error('[API] Create report error:', response.error);
    }
    
    if (response.status === 201) {
      console.log('[API] Report created successfully with ID:', response.body.id);
      return response.body.id;
    }
    throw new Error(`HTTP ${response.status}: ${response.error || 'Failed to create report'}`);
  }
  
  // Mock implementation
  return 'mock-report-id';
}

// List reports function  
export async function listReports(limit?: number, cursor?: string): Promise<{
  reports: Report<ProductIndex>[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}> {
  if (USE_REAL_API) {
    const response = await ReportsApiService.listReports(limit, cursor);
    if (response.status === 200) {
      return {
        reports: response.body.reports,
        nextCursor: response.body.next_cursor,
        hasMore: response.body.has_more,
        total: response.body.total
      };
    }
    throw new Error(response.error || 'Failed to list reports');
  }
  
  // Mock implementation
  const mockReports = reports.slice(0, limit || 20) as Report<ProductIndex>[];
  return {
    reports: mockReports,
    nextCursor: null,
    hasMore: false,
    total: mockReports.length
  };
}

// Get single report function (simple wrapper)
export async function getReport(id: string): Promise<Report<Product> | undefined> {
  return getFullReport(id, 'getReport');
}

export const reportsApi = { 
  createReport, 
  listReports, 
  getReport, 
  getFullReport
};