/**
 * Hooks Module Exports
 * Centralized exports for all custom hooks
 */

// Authentication hooks
export { useAuth } from './useAuth';
export { useSession } from './useSession';
export type { SessionStatus } from './useSession';

// Favorites management
export { useFavorites } from './useFavorites';

// API state management
export { useApiState, usePaginatedApi } from './useApiState';
export type { ApiState, UseApiStateReturn, PaginatedApiState, UsePaginatedApiReturn } from './useApiState';