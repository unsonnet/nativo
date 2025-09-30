/**
 * REST API Client with AWS Cognito Authentication
 * Provides a centralized way to make authenticated API calls
 */

import { withAuthHeaders } from '@/lib/auth/auth';
import type { K9Response } from '@/lib/auth/types';

// Base API URL - Update this to match your actual API endpoint
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.yourapp.com/v1';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<K9Response<T>> {
    return withAuthHeaders(async (authHeaders) => {
      try {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...options.headers,
          },
        });

        let body: any;
        try {
          body = await response.json();
        } catch {
          body = null;
        }

        if (!response.ok) {
          return {
            status: response.status,
            body: null as unknown as T,
            error: body?.message || `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        return {
          status: response.status,
          body,
          error: undefined,
        };
      } catch (error) {
        return {
          status: 500,
          body: null as unknown as T,
          error: error instanceof Error ? error.message : 'Network error',
        };
      }
    });
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<K9Response<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    return this.request<T>(endpoint + (params ? `?${url.searchParams}` : ''));
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<K9Response<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<K9Response<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<K9Response<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<K9Response<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * Upload file (multipart/form-data)
   */
  async upload<T>(endpoint: string, formData: FormData): Promise<K9Response<T>> {
    return withAuthHeaders(async (authHeaders) => {
      try {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {};
        Object.entries(authHeaders).forEach(([key, value]) => {
          if (value) headers[key] = value;
        });
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: formData,
        });

        let body: any;
        try {
          body = await response.json();
        } catch {
          body = null;
        }

        if (!response.ok) {
          return {
            status: response.status,
            body: null as unknown as T,
            error: body?.message || `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        return {
          status: response.status,
          body,
          error: undefined,
        };
      } catch (error) {
        return {
          status: 500,
          body: null as unknown as T,
          error: error instanceof Error ? error.message : 'Network error',
        };
      }
    });
  }

  /**
   * Download file (returns blob)
   */
  async download(endpoint: string): Promise<K9Response<Blob>> {
    return withAuthHeaders(async (authHeaders) => {
      try {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {};
        Object.entries(authHeaders).forEach(([key, value]) => {
          if (value) headers[key] = value;
        });
        
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          let errorBody: any;
          try {
            errorBody = await response.json();
          } catch {
            errorBody = null;
          }

          return {
            status: response.status,
            body: null as unknown as Blob,
            error: errorBody?.message || `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        const blob = await response.blob();
        return {
          status: response.status,
          body: blob,
          error: undefined,
        };
      } catch (error) {
        return {
          status: 500,
          body: null as unknown as Blob,
          error: error instanceof Error ? error.message : 'Network error',
        };
      }
    });
  }
}

// Default API client instance
export const apiClient = new ApiClient();