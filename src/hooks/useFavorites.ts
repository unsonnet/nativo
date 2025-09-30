import { useState, useEffect, useCallback } from 'react';
import type { ProductIndex } from '@/types/report';
import {
  getSessionFavorites,
  getSessionFavoriteIds,
  toggleFavorite as toggleFavoriteUtil,
  initializeFavoritesFromReport,
  clearSessionFavorites,
  type FavoriteProduct
} from '@/lib/utils/favorites';

interface UseFavoritesOptions {
  /** Initial favorites from the database (loaded with the report) */
  initialFavorites?: string[];
  /** Search results to help reconstruct favorite products */
  searchResults?: ProductIndex[];
  /** Whether to auto-clear favorites when component unmounts */
  autoClear?: boolean;
}

export function useFavorites(reportId: string, options: UseFavoritesOptions = {}) {
  const { initialFavorites = [], searchResults = [], autoClear = true } = options;
  
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize favorites from database when report loads
  useEffect(() => {
    if (initialFavorites.length > 0 && searchResults.length > 0 && !isInitialized) {
      initializeFavoritesFromReport(reportId, initialFavorites, searchResults);
      setIsInitialized(true);
    }
  }, [reportId, initialFavorites, searchResults, isInitialized]);

  // Load session favorites and keep them in sync
  useEffect(() => {
    const loadSessionFavorites = () => {
      setFavoriteIds(getSessionFavoriteIds(reportId));
      setFavorites(getSessionFavorites(reportId));
    };

    loadSessionFavorites();

    // Listen for session storage changes (for multiple tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes(`session.favorites.${reportId}`)) {
        loadSessionFavorites();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [reportId]);

  // Clear session favorites when leaving the report (optional)
  useEffect(() => {
    if (autoClear) {
      return () => {
        clearSessionFavorites(reportId);
      };
    }
  }, [reportId, autoClear]);

  const toggleFavorite = useCallback(async (product: ProductIndex) => {
    try {
      const newIsFavorited = await toggleFavoriteUtil(reportId, product);

      // Update state immediately for responsive UI
      setFavoriteIds(getSessionFavoriteIds(reportId));
      setFavorites(getSessionFavorites(reportId));

      return newIsFavorited;
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      return false;
    }
  }, [reportId]);

  const isFavorited = useCallback((productId: string) => {
    return favoriteIds.includes(productId);
  }, [favoriteIds]);

  return {
    favorites,
    favoriteIds,
    isFavorited,
    toggleFavorite,
    isInitialized
  };
}