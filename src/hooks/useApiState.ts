/**
 * API State Management Hook
 * Provides consistent loading states and error handling for API calls
 */

import { useState, useCallback } from 'react';
import type { K9Response } from '@/lib/auth/types';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseApiStateReturn<T> {
  state: ApiState<T>;
  execute: (apiCall: () => Promise<K9Response<T>>) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
  setError: (error: string | null) => void;
}

/**
 * Hook for managing API call state with consistent loading and error handling
 */
export function useApiState<T>(): UseApiStateReturn<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (apiCall: () => Promise<K9Response<T>>): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiCall();
      
      if (response.status >= 200 && response.status < 300) {
        setState({
          data: response.body,
          loading: false,
          error: null,
        });
        return response.body;
      } else {
        const errorMessage = response.error || `HTTP ${response.status}`;
        setState({
          data: null,
          loading: false,
          error: errorMessage,
        });
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  return {
    state,
    execute,
    reset,
    setData,
    setError,
  };
}

/**
 * Hook for managing paginated API calls
 */
export interface PaginatedApiState<T> extends ApiState<T[]> {
  page: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
}

export interface UsePaginatedApiReturn<T> {
  state: PaginatedApiState<T>;
  loadPage: (page: number) => Promise<T[] | null>;
  loadMore: () => Promise<T[] | null>;
  reset: () => void;
}

export function usePaginatedApi<T>(
  apiCall: (page: number, limit: number) => Promise<K9Response<{ items: T[]; total: number; page: number; limit: number }>>,
  limit: number = 20
): UsePaginatedApiReturn<T> {
  const [state, setState] = useState<PaginatedApiState<T>>({
    data: [],
    loading: false,
    error: null,
    page: 0,
    totalPages: 0,
    total: 0,
    hasMore: false,
  });

  const loadPage = useCallback(async (page: number): Promise<T[] | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiCall(page, limit);
      
      if (response.status >= 200 && response.status < 300) {
        const { items, total, page: responsePage } = response.body;
        const totalPages = Math.ceil(total / limit);
        
        setState({
          data: items,
          loading: false,
          error: null,
          page: responsePage,
          totalPages,
          total,
          hasMore: responsePage < totalPages,
        });
        return items;
      } else {
        const errorMessage = response.error || `HTTP ${response.status}`;
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return null;
    }
  }, [apiCall, limit]);

  const loadMore = useCallback(async (): Promise<T[] | null> => {
    if (!state.hasMore || state.loading) return null;
    return loadPage(state.page + 1);
  }, [state.hasMore, state.loading, state.page, loadPage]);

  const reset = useCallback(() => {
    setState({
      data: [],
      loading: false,
      error: null,
      page: 0,
      totalPages: 0,
      total: 0,
      hasMore: false,
    });
  }, []);

  return {
    state,
    loadPage,
    loadMore,
    reset,
  };
}