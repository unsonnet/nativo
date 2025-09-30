/**
 * Reports API Service
 * Handles all report-related REST API calls
 */

import { apiClient } from './client';
import type { Report, Product, ProductIndex } from '@/types/report';
import type { K9Response } from '@/lib/auth/types';

export interface CreateReportRequest {
  title: string;
  reference: Product;
}

export interface CreateReportResponse {
  id: string;
  title: string;
  author: string;
  date: string;
}

export interface ListReportsResponse {
  reports: Report<ProductIndex>[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchFilters {
  category?: {
    type?: string;
    material?: string;
    look?: string;
    texture?: string;
    finish?: string;
    edge?: string;
  };
  brand?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  similarity?: {
    threshold?: number;
  };
}

export interface SearchProductsRequest {
  filters: SearchFilters;
  page?: number;
  limit?: number;
}

export interface SearchProductsResponse {
  products: ProductIndex[];
  total: number;
  page: number;
  limit: number;
}

export class ReportsApiService {
  /**
   * 1. Get list of reports associated with the current user
   * GET /api/reports
   */
  static async listReports(page: number = 1, limit: number = 20): Promise<K9Response<ListReportsResponse>> {
    return apiClient.get<ListReportsResponse>('/reports', {
      page: page.toString(),
      limit: limit.toString(),
    });
  }

  /**
   * 2. Create a new report and get back report ID
   * POST /api/reports
   */
  static async createReport(data: CreateReportRequest): Promise<K9Response<CreateReportResponse>> {
    return apiClient.post<CreateReportResponse>('/reports', data);
  }

  /**
   * 3. Get full report details given report ID
   * GET /api/reports/:reportId
   */
  static async getReport(reportId: string): Promise<K9Response<Report<Product>>> {
    return apiClient.get<Report<Product>>(`/reports/${reportId}`);
  }

  /**
   * 4. Search for products within a report using filters
   * POST /api/reports/:reportId/search
   */
  static async searchProducts(reportId: string, searchRequest: SearchProductsRequest): Promise<K9Response<SearchProductsResponse>> {
    return apiClient.post<SearchProductsResponse>(`/reports/${reportId}/search`, searchRequest);
  }

  /**
   * 5. Get full product details given report ID and product ID
   * GET /api/reports/:reportId/products/:productId
   */
  static async getProduct(reportId: string, productId: string): Promise<K9Response<Product>> {
    return apiClient.get<Product>(`/reports/${reportId}/products/${productId}`);
  }

  /**
   * 6. Update favorite status of a product in a report
   * PUT /api/reports/:reportId/favorites/:productId
   */
  static async updateFavoriteStatus(reportId: string, productId: string, isFavorite: boolean): Promise<K9Response<{ success: boolean }>> {
    return apiClient.put<{ success: boolean }>(`/reports/${reportId}/favorites/${productId}`, {
      isFavorite,
    });
  }

  /**
   * 7. Sync all favorites for a report (bulk update)
   * PUT /api/reports/:reportId/favorites
   */
  static async syncFavorites(reportId: string, favoriteIds: string[]): Promise<K9Response<{ success: boolean }>> {
    return apiClient.put<{ success: boolean }>(`/reports/${reportId}/favorites`, {
      favorites: favoriteIds,
    });
  }

  /**
   * 8. Export favorited products as ZIP file
   * GET /api/reports/:reportId/export
   */
  static async exportFavorites(reportId: string): Promise<K9Response<Blob>> {
    return apiClient.download(`/reports/${reportId}/export`);
  }

  /**
   * Delete a report
   * DELETE /api/reports/:reportId
   */
  static async deleteReport(reportId: string): Promise<K9Response<{ success: boolean }>> {
    return apiClient.delete<{ success: boolean }>(`/reports/${reportId}`);
  }

  /**
   * Update report metadata
   * PATCH /api/reports/:reportId
   */
  static async updateReport(reportId: string, updates: Partial<Pick<Report<Product>, 'title'>>): Promise<K9Response<Report<Product>>> {
    return apiClient.patch<Report<Product>>(`/reports/${reportId}`, updates);
  }
}

export const reportsApiService = ReportsApiService;