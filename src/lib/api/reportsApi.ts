/**
 * Reports API Service - Updated to use Original API Adapter
 * 
 * This service now uses the original API endpoints through adapter functions
 * that translate between the React app's expected interface and the original API format.
 */

import { apiClient } from './client';
import { OriginalApiAdapter, transformSearchResultToProduct, createFullProductFromOriginal, transformJobToReport, transformFavoriteToProduct } from './adapters/originalApiAdapter';
import { decodeReportId, encodeReportTitle } from '@/lib/utils/jobIdentifiers';
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
  limit: number;
  next_cursor: string | null;  // DynamoDB pagination cursor
  has_more: boolean;          // Whether there are more results
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
   * Now uses original API: GET /report
   */
  static async listReports(limit: number = 20, cursor?: string): Promise<K9Response<ListReportsResponse>> {
    const response = await OriginalApiAdapter.listAllReports();
    
    if (response.status === 200) {
      // Transform original API jobs to ProductIndex reports for list view
      const reports: Report<ProductIndex>[] = response.body.map(job => {
        const product = createFullProductFromOriginal(job.reference, job.job, job.job);
        
        // Convert to ProductIndex for list view
        const productIndex: ProductIndex = {
          id: product.id,
          brand: product.brand || 'Unknown',
          series: product.series,
          model: product.model,
          image: product.images[0]?.url || '',
          analysis: product.analysis ? {
            color: {
              primary: {
                vector: [product.analysis.color.primary.vector[0] || 0, product.analysis.color.primary.vector[1] || 0],
                similarity: product.analysis.color.primary.similarity
              },
              secondary: {
                vector: [product.analysis.color.secondary.vector[0] || 0, product.analysis.color.secondary.vector[1] || 0],
                similarity: product.analysis.color.secondary.similarity
              }
            },
            pattern: {
              primary: {
                vector: [product.analysis.pattern.primary.vector[0] || 0, product.analysis.pattern.primary.vector[1] || 0],
                similarity: product.analysis.pattern.primary.similarity
              },
              secondary: {
                vector: [product.analysis.pattern.secondary.vector[0] || 0, product.analysis.pattern.secondary.vector[1] || 0],
                similarity: product.analysis.pattern.secondary.similarity
              }
            },
            similarity: product.analysis.similarity
          } : undefined
        };
        
        return {
          id: job.job,
          title: decodeReportId(job.job),
          author: 'current-user', // TODO: Get from auth context
          date: new Date(job.created + 'T00:00:00Z').toISOString(),
          reference: productIndex,
          favorites: job.favorites.map(fav => fav.id)
        };
      });
      
      // Apply pagination (since original API returns all results)
      const startIndex = cursor ? parseInt(cursor) || 0 : 0;
      const endIndex = startIndex + limit;
      const paginatedReports = reports.slice(startIndex, endIndex);
      const hasMore = endIndex < reports.length;
      const nextCursor = hasMore ? endIndex.toString() : null;
      
      return {
        status: 200,
        body: {
          reports: paginatedReports,
          total: reports.length,
          limit,
          next_cursor: nextCursor,
          has_more: hasMore
        },
        error: undefined
      };
    }
    
    return {
      status: response.status,
      body: {
        reports: [],
        total: 0,
        limit,
        next_cursor: null,
        has_more: false
      },
      error: response.error
    };
  }

  /**
   * 2. Create a new report and get back report ID
   * Uses original API: PUT /fetch/{job}
   */
  static async createReport(data: CreateReportRequest): Promise<K9Response<CreateReportResponse>> {
    const response = await OriginalApiAdapter.createReport(data.title, data.reference);
    
    if (response.status === 201) {
      return {
        status: 201,
        body: {
          id: response.body.id,
          title: data.title,
          author: 'current-user', // TODO: Get from auth context
          date: new Date().toISOString()
        },
        error: undefined
      };
    }
    
    return {
      status: response.status,
      body: {
        id: '',
        title: '',
        author: '',
        date: ''
      },
      error: response.error
    };
  }

  /**
   * 3. Get full report details given report ID
   * Now uses original API: GET /report (and filters for specific job)
   */
  static async getReport(reportId: string): Promise<K9Response<Report<Product>>> {
    const response = await OriginalApiAdapter.listAllReports();
    
    if (response.status === 200) {
      // Debug: log what we're looking for vs what we have
      console.log('[API] Looking for reportId:', reportId);
      console.log('[API] Available jobs:', response.body.map(j => j.job));
      
      // Try to find the job with exact match first
      let job = response.body.find(j => j.job === reportId);
      
      // If not found, try with URL encoding/decoding
      if (!job) {
        job = response.body.find(j => j.job === encodeReportTitle(reportId));
      }
      
      // If still not found, try with decoding the reportId
      if (!job) {
        try {
          const decodedReportId = decodeURIComponent(reportId);
          job = response.body.find(j => j.job === decodedReportId);
        } catch (e) {
          // Ignore decode errors
        }
      }
      
      // If still not found, try partial matching (case-insensitive)
      if (!job) {
        job = response.body.find(j => 
          j.job.toLowerCase() === reportId.toLowerCase() ||
          j.job.toLowerCase().includes(reportId.toLowerCase()) ||
          reportId.toLowerCase().includes(j.job.toLowerCase())
        );
      }
      
      if (job) {
        console.log('[API] Found job:', job.job);
        const report = transformJobToReport(job);
        return {
          status: 200,
          body: report,
          error: undefined
        };
      } else {
        console.error('[API] Job not found for reportId:', reportId);
        return {
          status: 404,
          body: null as any,
          error: 'Report not found'
        };
      }
    }
    
    return {
      status: response.status,
      body: null as any,
      error: response.error
    };
  }

  /**
   * 4. Search for products within a report using filters
   * Uses original API: POST /fetch/{job}
   */
  static async searchProducts(reportId: string, searchRequest: SearchProductsRequest): Promise<K9Response<SearchProductsResponse>> {
    const start = ((searchRequest.page || 1) - 1) * (searchRequest.limit || 20);
    
    const searchResponse = await OriginalApiAdapter.searchSimilarMaterials(
      reportId,
      searchRequest.filters,
      start
    );
    
    if (searchResponse.status === 200) {
      const products = searchResponse.body.map(result => 
        transformSearchResultToProduct(result)
      );
      
      return {
        status: 200,
        body: {
          products,
          total: products.length, // Original API doesn't provide total count
          page: searchRequest.page || 1,
          limit: searchRequest.limit || 20
        },
        error: undefined
      };
    }
    
    return {
      status: searchResponse.status,
      body: {
        products: [],
        total: 0,
        page: 1,
        limit: 20
      },
      error: searchResponse.error
    };
  }

  /**
   * 5. Get full product details given report ID and product ID
   * Now uses original API: GET /report/{job}/favorites (and filters for specific product)
   */
  static async getProduct(reportId: string, productId: string): Promise<K9Response<Product>> {
    const response = await OriginalApiAdapter.getFavorites(reportId);
    
    if (response.status === 200) {
      // Find the specific product in the favorites
      const favoriteProduct = response.body.find(fav => fav.id === productId);
      
      if (favoriteProduct) {
        const product = transformFavoriteToProduct(favoriteProduct);
        return {
          status: 200,
          body: product,
          error: undefined
        };
      } else {
        return {
          status: 404,
          body: null as any,
          error: 'Product not found in favorites'
        };
      }
    }
    
    return {
      status: response.status,
      body: null as any,
      error: response.error
    };
  }

  /**
   * 6. Update favorite status of a product in a report
   * Now uses original API: POST /report/{job}/favorites
   */
  static async updateFavoriteStatus(reportId: string, productId: string, isFavorite: boolean): Promise<K9Response<{ success: boolean }>> {
    const response = await OriginalApiAdapter.toggleFavorite(reportId, productId);
    
    if (response.status === 200) {
      return {
        status: 200,
        body: { success: true },
        error: undefined
      };
    }
    
    return {
      status: response.status,
      body: { success: false },
      error: response.error
    };
  }

  /**
   * 7. Sync all favorites for a report (bulk update)
   * Now uses original API: PUT /report/{job}/favorites
   */
  static async syncFavorites(reportId: string, favoriteIds: string[]): Promise<K9Response<{ success: boolean }>> {
    const response = await OriginalApiAdapter.updateFavorites(reportId, favoriteIds);
    
    if (response.status === 200) {
      return {
        status: 200,
        body: { success: true },
        error: undefined
      };
    }
    
    return {
      status: response.status,
      body: { success: false },
      error: response.error
    };
  }

  /**
   * 8. Export favorited products as ZIP file
   * NOTE: Original API doesn't have export functionality
   * TODO: Implement export functionality in backend
   */
  static async exportFavorites(reportId: string): Promise<K9Response<Blob>> {
    // TODO: Implement export functionality in backend
    console.warn('[API] exportFavorites not implemented - need backend export functionality');
    
    return {
      status: 501,
      body: null as any,
      error: 'Export functionality not implemented'
    };
  }

  /**
   * Delete a report
   * NOTE: Original API still doesn't have delete functionality
   * TODO: Implement report deletion in backend (DELETE /report/{job})
   */
  static async deleteReport(reportId: string): Promise<K9Response<{ success: boolean }>> {
    // TODO: Implement report deletion in backend
    console.warn('[API] deleteReport not implemented - need backend delete functionality');
    
    return {
      status: 501,
      body: { success: false },
      error: 'Delete functionality not implemented'
    };
  }

  /**
   * Update report metadata
   * NOTE: Original API still doesn't have update functionality
   * TODO: Implement report metadata updates in backend (PATCH /report/{job})
   */
  static async updateReport(reportId: string, updates: Partial<Pick<Report<Product>, 'title'>>): Promise<K9Response<Report<Product>>> {
    // TODO: Implement report metadata updates in backend
    console.warn('[API] updateReport not implemented - need backend update functionality');
    
    return {
      status: 501,
      body: null as any,
      error: 'Update functionality not implemented'
    };
  }
}

export const reportsApiService = ReportsApiService;