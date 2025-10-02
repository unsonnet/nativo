/**
 * Original API Adapter
 * 
 * This adapter bridges the React app's expected API interface with the original 
 * API endpoints documented in current-api-endpoints.md. It transforms request/response
 * data between the two formats.
 */

import { apiClient } from '../client';
import type { K9Response } from '@/lib/auth/types';
import type { Report, Product, ProductIndex, ProductImage } from '@/types/report';
import { encodeReportTitle, decodeReportId, sanitizeFilename } from '@/lib/utils/jobIdentifiers';

// Types for the original API
interface OriginalApiMaterial {
  type: string;
  material: string;
  length: number;
  width: number;
  thickness: number | null;
  images: string[];
}

interface OriginalApiSearchRequest {
  type_: {
    type: number;
    material: number;
    missing: boolean;
  };
  shape: {
    length: number;
    width: number;
    thickness: number;
    missing: boolean;
  };
  color: {
    primary: number;
    secondary: number;
    tertiary: number;
    missing: boolean;
  };
  pattern: {
    primary: number;
    secondary: number;
    tertiary: number;
    missing: boolean;
  };
}

interface OriginalApiSearchResult {
  id: string;
  match: number;
  images: string[];
  scores: {
    shape: {
      length: number | null;
      width: number | null;
      thickness: number | null;
    };
    color: {
      primary: number | null;
      secondary: number | null;
      tertiary: number | null;
    };
    pattern: {
      primary: number | null;
      secondary: number | null;
      tertiary: number | null;
    };
  };
  description?: {
    store: string;
    name: string;
    url: string;
    material: string;
    length: number | null;
    width: number | null;
    thickness: number | null;
  };
}

// New types for /report endpoints
interface OriginalApiJobListing {
  job: string;
  created: string;
  reference: string; // Single presigned URL instead of full material data
}

interface OriginalApiJob {
  job: string;
  created: string;
  reference: OriginalApiMaterial;
  favorites: OriginalApiFavoriteProduct[];
}

interface OriginalApiFavoriteProduct {
  id: string;
  images: string[];
  description: {
    store: string;
    name: string;
    url: string;
    material: string;
    length: number | null;
    width: number | null;
    thickness: number | null;
  };
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Transform Product reference from React app format to original API format
 */
function transformProductToOriginalFormat(product: Product): OriginalApiMaterial {
  const primaryFormat = product.formats[0];
  
  return {
    type: product.category.type || 'tile',
    material: product.category.material || 'ceramic',
    length: primaryFormat?.length?.val || 24,
    width: primaryFormat?.width?.val || 12,
    thickness: primaryFormat?.thickness?.val || null,
    images: product.images.map(img => {
      // Extract filename from URL for original API
      if (img.url.startsWith('data:') || img.url.startsWith('blob:')) {
        // For data URLs or blobs, generate a filename
        return sanitizeFilename(`${img.id}.jpg`);
      }
      try {
        const url = new URL(img.url);
        const filename = url.pathname.split('/').pop() || `${img.id}.jpg`;
        return sanitizeFilename(filename);
      } catch {
        // If URL parsing fails, use the image ID
        return sanitizeFilename(`${img.id}.jpg`);
      }
    })
  };
}

/**
 * Transform original API search result to React app Product format
 */
function transformSearchResultToProduct(result: OriginalApiSearchResult): ProductIndex {
  return {
    id: result.id,
    brand: result.description?.store || 'Unknown',
    model: result.description?.name || `Material ${result.id}`,
    image: result.images[0] || '',
    analysis: {
      color: {
        primary: {
          vector: [
            result.scores.color.primary || 0,
            result.scores.color.secondary || 0
          ],
          similarity: result.scores.color.primary || 0
        },
        secondary: {
          vector: [
            result.scores.color.secondary || 0,
            result.scores.color.tertiary || 0
          ],
          similarity: result.scores.color.secondary || 0
        }
      },
      pattern: {
        primary: {
          vector: [
            result.scores.pattern.primary || 0,
            result.scores.pattern.secondary || 0
          ],
          similarity: result.scores.pattern.primary || 0
        },
        secondary: {
          vector: [
            result.scores.pattern.secondary || 0,
            result.scores.pattern.tertiary || 0
          ],
          similarity: result.scores.pattern.secondary || 0
        }
      },
      similarity: result.match
    }
  };
}

/**
 * Transform original API search result to full React app Product format
 */
function transformSearchResultToFullProduct(result: OriginalApiSearchResult): Product {
  const productImages: ProductImage[] = result.images.map((imageUrl, index) => ({
    id: `${result.id}_img${index + 1}`,
    url: imageUrl
  }));

  return {
    id: result.id,
    brand: result.description?.store || 'Unknown',
    model: result.description?.name || `Material ${result.id}`,
    images: productImages,
    category: {
      type: 'Tile', // Default type, capitalized
      material: capitalize(result.description?.material || 'ceramic'),
    },
    formats: [{
      length: result.description?.length ? { val: result.description.length, unit: 'in' as const } : undefined,
      width: result.description?.width ? { val: result.description.width, unit: 'in' as const } : undefined,
      thickness: result.description?.thickness ? { val: result.description.thickness, unit: 'mm' as const } : undefined,
      vendors: [{
        sku: `${result.id}-001`,
        store: result.description?.store || 'Unknown',
        name: result.description?.name || `Material ${result.id}`,
        url: result.description?.url || '#',
        discontinued: false
      }]
    }],
    analysis: {
      color: {
        primary: {
          vector: [
            result.scores.color.primary || 0,
            result.scores.color.secondary || 0
          ],
          similarity: result.scores.color.primary || 0
        },
        secondary: {
          vector: [
            result.scores.color.secondary || 0,
            result.scores.color.tertiary || 0
          ],
          similarity: result.scores.color.secondary || 0
        }
      },
      pattern: {
        primary: {
          vector: [
            result.scores.pattern.primary || 0,
            result.scores.pattern.secondary || 0
          ],
          similarity: result.scores.pattern.primary || 0
        },
        secondary: {
          vector: [
            result.scores.pattern.secondary || 0,
            result.scores.pattern.tertiary || 0
          ],
          similarity: result.scores.pattern.secondary || 0
        }
      },
      similarity: result.match
    }
  };
}

/**
 * Transform original API favorite product to React app Product format
 */
function transformFavoriteToProduct(favorite: OriginalApiFavoriteProduct): Product {
  const productImages: ProductImage[] = favorite.images.map((imageUrl, index) => ({
    id: `${favorite.id}_img${index + 1}`,
    url: imageUrl
  }));

  return {
    id: favorite.id,
    brand: favorite.description.store || 'Unknown',
    model: favorite.description.name || `Material ${favorite.id}`,
    images: productImages,
    category: {
      type: 'Tile', // Default type, capitalized
      material: capitalize(favorite.description.material),
    },
    formats: [{
      length: favorite.description.length ? { val: favorite.description.length, unit: 'in' as const } : undefined,
      width: favorite.description.width ? { val: favorite.description.width, unit: 'in' as const } : undefined,
      thickness: favorite.description.thickness ? { val: favorite.description.thickness, unit: 'mm' as const } : undefined,
      vendors: [{
        sku: `${favorite.id}-001`,
        store: favorite.description.store,
        name: favorite.description.name,
        url: favorite.description.url,
        discontinued: false
      }]
    }]
  };
}
function createFullProductFromOriginal(
  material: OriginalApiMaterial, 
  reportId: string,
  materialId: string
): Product {
  const productImages: ProductImage[] = material.images.map((imageUrl, index) => ({
    id: `${materialId}_img${index + 1}`,
    url: imageUrl
  }));

  return {
    id: materialId,
    brand: 'Unknown', // Original API doesn't provide brand
    model: `${capitalize(material.type)} ${capitalize(material.material)}`,
    images: productImages,
    category: {
      type: capitalize(material.type),
      material: capitalize(material.material),
    },
    formats: [{
      length: material.length ? { val: material.length, unit: 'in' as const } : undefined,
      width: material.width ? { val: material.width, unit: 'in' as const } : undefined,
      thickness: material.thickness ? { val: material.thickness, unit: 'mm' as const } : undefined,
      vendors: [{
        sku: `${materialId}-001`,
        store: 'Material Database',
        name: `${capitalize(material.type)} ${capitalize(material.material)}`,
        url: '#',
        discontinued: false
      }]
    }]
  };
}

export class OriginalApiAdapter {
  /**
   * Create a "report" (job) in the original API
   * This corresponds to PUT /fetch/{job} in the original API
   */
  static async createReport(title: string, reference: Product): Promise<K9Response<{ id: string; runId?: string }>> {
    // Encode the title to use as job identifier
    const jobId = encodeReportTitle(title);
    
    // Transform product to original API format
    const materialData = transformProductToOriginalFormat(reference);
    
    try {
      // First, upload images to album if they exist
      for (const image of reference.images) {
        if (image.url.startsWith('data:') || image.url.startsWith('blob:')) {
          // Handle base64 or blob URLs - need to upload to album
          // For now, skip actual upload since we don't have the image data
          console.warn('Image upload not implemented for blob/data URLs');
        }
      }
      
      // Create the job with material data
      const response = await apiClient.put<string>(`/fetch/${jobId}`, materialData);
      
      if (response.status === 200) {
        return {
          status: 201, // Translate to 201 for creation
          body: { 
            id: jobId,
            runId: response.body // The run ID from the original API
          },
          error: undefined
        };
      }
      
      return {
        status: response.status,
        body: { id: '' },
        error: response.error || 'Failed to create report'
      };
    } catch (error) {
      return {
        status: 500,
        body: { id: '' },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get report data from original API
   * This corresponds to GET /fetch/{job} in the original API
   */
  static async getReport(reportId: string): Promise<K9Response<OriginalApiMaterial>> {
    return apiClient.get<OriginalApiMaterial>(`/fetch/${reportId}`);
  }

  /**
   * Search for similar materials using the original API
   * This corresponds to POST /fetch/{job} in the original API
   */
  static async searchSimilarMaterials(
    reportId: string, 
    filters?: any,
    start: number = 0
  ): Promise<K9Response<OriginalApiSearchResult[]>> {
    // Build search thresholds from filters or use defaults
    const searchRequest: OriginalApiSearchRequest = {
      type_: {
        type: 0.8,
        material: 0.8,
        missing: true
      },
      shape: {
        length: 0.7,
        width: 0.7,
        thickness: 0.8,
        missing: true
      },
      color: {
        primary: filters?.similarity?.threshold || 0.8,
        secondary: 0.7,
        tertiary: 0.6,
        missing: true
      },
      pattern: {
        primary: 0.9,
        secondary: 0.8,
        tertiary: 0.7,
        missing: true
      }
    };

    // Include start parameter in the request if provided
    if (start > 0) {
      return apiClient.post<OriginalApiSearchResult[]>(`/fetch/${reportId}?start=${start}`, searchRequest);
    } else {
      return apiClient.post<OriginalApiSearchResult[]>(`/fetch/${reportId}`, searchRequest);
    }
  }

  /**
   * Upload image to job album
   * This corresponds to PUT /fetch/{job}/album/{filename} in the original API
   */
  static async uploadImage(
    reportId: string, 
    filename: string, 
    imageData: Blob | ArrayBuffer
  ): Promise<K9Response<void>> {
    try {
      // Get the base URL from environment or use the client's base URL
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://824xuvy567.execute-api.us-east-2.amazonaws.com/securek9';
      
      const response = await fetch(`${baseUrl}/fetch/${reportId}/album/${filename}`, {
        method: 'PUT',
        body: imageData,
        headers: {
          'Content-Type': imageData instanceof Blob ? imageData.type : 'application/octet-stream'
        }
      });

      if (response.ok) {
        return {
          status: 200,
          body: undefined,
          error: undefined
        };
      }

      return {
        status: response.status,
        body: undefined,
        error: `Failed to upload image: ${response.statusText}`
      };
    } catch (error) {
      return {
        status: 500,
        body: undefined,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Get all reports/jobs for the authenticated user
   * This corresponds to GET /report in the original API
   */
  static async listAllReports(): Promise<K9Response<OriginalApiJobListing[]>> {
    return apiClient.get<OriginalApiJobListing[]>('/report');
  }

  /**
   * Transform an OriginalApiJobListing (from GET /report) to Report<ProductIndex>
   */
  static transformJobListingToReport(jobListing: OriginalApiJobListing): Report<ProductIndex> {
    const referenceMaterial: ProductIndex = {
      id: `${jobListing.job}-reference`,
      brand: 'Unknown',
      model: jobListing.job,
      image: jobListing.reference
    };

    return {
      id: jobListing.job,
      title: jobListing.job,
      author: 'current-user', // We don't have author in the listing
      date: new Date(jobListing.created).toISOString(),
      reference: referenceMaterial,
      favorites: [] // No favorites in the listing data
    };
  }

  /**
   * Get favorites for a specific job
   * This corresponds to GET /report/{job}/favorites in the original API
   */
  static async getFavorites(reportId: string): Promise<K9Response<OriginalApiFavoriteProduct[]>> {
    return apiClient.get<OriginalApiFavoriteProduct[]>(`/report/${reportId}/favorites`);
  }

  /**
   * Replace all favorites for a specific job
   * This corresponds to PUT /report/{job}/favorites in the original API
   */
  static async updateFavorites(reportId: string, productIds: string[]): Promise<K9Response<{ product_ids: string[] }>> {
    return apiClient.put<{ product_ids: string[] }>(`/report/${reportId}/favorites`, {
      product_ids: productIds
    });
  }

  /**
   * Toggle a single favorite for a specific job
   * This corresponds to POST /report/{job}/favorites in the original API
   */
  static async toggleFavorite(reportId: string, productId: string): Promise<K9Response<{ product_ids: string[] }>> {
    return apiClient.post<{ product_ids: string[] }>(`/report/${reportId}/favorites`, {
      product_id: productId
    });
  }

  /**
   * Get a single product by ID from the new product endpoint
   * This corresponds to GET /fetch/{job}/product/{id} in the original API
   */
  static async getProductById(reportId: string, productId: string): Promise<K9Response<Product>> {
    try {
      const response = await apiClient.get<OriginalApiSearchResult>(`/fetch/${reportId}/product/${productId}`);
      
      if (response.status === 200) {
        const product = transformSearchResultToFullProduct(response.body);
        return {
          status: 200,
          body: product,
          error: undefined
        };
      }
      
      return {
        status: response.status,
        body: null as any,
        error: response.error || 'Product not found'
      };
    } catch (error) {
      return {
        status: 500,
        body: null as any,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get a single product by ID from search results
   * Since the original API doesn't have a direct "get product by ID" endpoint,
   * this searches all results to find the specific product
   * @deprecated Use getProductById instead - this method is expensive
   */
  static async getProductFromSearch(reportId: string, productId: string): Promise<K9Response<Product>> {
    // Search with very permissive filters to get all results
    const searchRequest: OriginalApiSearchRequest = {
      type_: { type: 0.1, material: 0.1, missing: true },
      shape: { length: 0.1, width: 0.1, thickness: 0.1, missing: true },
      color: { primary: 0.1, secondary: 0.1, tertiary: 0.1, missing: true },
      pattern: { primary: 0.1, secondary: 0.1, tertiary: 0.1, missing: true }
    };

    try {
      const response = await apiClient.post<OriginalApiSearchResult[]>(`/fetch/${reportId}`, searchRequest);
      
      if (response.status === 200) {
        // Find the specific product in the search results
        const searchResult = response.body.find(result => result.id === productId);
        
        if (searchResult) {
          const product = transformSearchResultToFullProduct(searchResult);
          return {
            status: 200,
            body: product,
            error: undefined
          };
        } else {
          return {
            status: 404,
            body: null as any,
            error: 'Product not found in search results'
          };
        }
      }
      
      return {
        status: response.status,
        body: null as any,
        error: response.error || 'Failed to search for product'
      };
    } catch (error) {
      return {
        status: 500,
        body: null as any,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export { 
  transformProductToOriginalFormat, 
  transformSearchResultToProduct, 
  transformSearchResultToFullProduct,
  createFullProductFromOriginal,
  transformFavoriteToProduct
};