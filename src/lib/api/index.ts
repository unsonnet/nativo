/**
 * API Module Exports
 * Centralized exports for all API-related functionality
 */

// Core API client
export { apiClient, ApiClient } from './client';
export type { ApiError } from './client';

// Service classes
export { reportsApiService, ReportsApiService } from './reportsApi';
export { userApiService, UserApiService } from './userApi';

// Bridge layer (existing functionality with API integration)
export { createReport, listReports, getReport, getFullReport, reportsApi } from './reports';

// Types
export type {
  CreateReportRequest,
  CreateReportResponse,
  ListReportsResponse,
  SearchFilters,
  SearchProductsRequest,
  SearchProductsResponse,
} from './reportsApi';

export type {
  UserProfile,
  UpdateProfileRequest,
} from './userApi';