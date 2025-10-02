import { useState, useEffect, useCallback } from 'react';
import type { ProductIndex } from '@/types/report';
import {
  getSessionFavorites,
  getSessionFavoriteIds,
  toggleFavorite as toggleFavoriteUtil,
  clearSessionFavorites,
  type FavoriteProduct
} from '@/lib/utils/favorites';
import { reportsApiService } from '@/lib/api/reportsApi';

interface UseFavoritesOptions {
  /** Whether to auto-clear favorites when component unmounts */
  autoClear?: boolean;
}

export function useFavorites(reportId: string, options: UseFavoritesOptions = {}) {
  const { autoClear = true } = options;
  
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load favorites from API when hook initializes
  useEffect(() => {
    const loadFavorites = async () => {
      if (isInitialized) return;
      
      // Check if we already have favorites in session storage to avoid duplicate API calls
      const existingFavorites = getSessionFavorites(reportId);
      if (existingFavorites.length > 0) {
        console.log('[Favorites] Using existing session favorites for report:', reportId);
        setFavorites(existingFavorites);
        setFavoriteIds(existingFavorites.map(f => f.id));
        setIsInitialized(true);
        return;
      }
      
      try {
        console.log('[Favorites] Loading favorites for report:', reportId);
        const response = await reportsApiService.getFavorites(reportId);
        
        if (response.status === 200) {
          // Convert Product[] to FavoriteProduct[] and store in session
          const favoriteProducts: FavoriteProduct[] = response.body.map(product => ({
            id: product.id,
            brand: product.brand || 'Unknown',
            series: product.series,
            model: product.model,
            image: product.images[0]?.url || '',
            analysis: product.analysis ? {
              color: {
                primary: {
                  vector: [
                    product.analysis.color.primary.vector[0] || 0,
                    product.analysis.color.primary.vector[1] || 0
                  ] as [number, number],
                  similarity: product.analysis.color.primary.similarity
                },
                secondary: {
                  vector: [
                    product.analysis.color.secondary.vector[0] || 0,
                    product.analysis.color.secondary.vector[1] || 0
                  ] as [number, number],
                  similarity: product.analysis.color.secondary.similarity
                }
              },
              pattern: {
                primary: {
                  vector: [
                    product.analysis.pattern.primary.vector[0] || 0,
                    product.analysis.pattern.primary.vector[1] || 0
                  ] as [number, number],
                  similarity: product.analysis.pattern.primary.similarity
                },
                secondary: {
                  vector: [
                    product.analysis.pattern.secondary.vector[0] || 0,
                    product.analysis.pattern.secondary.vector[1] || 0
                  ] as [number, number],
                  similarity: product.analysis.pattern.secondary.similarity
                }
              },
              similarity: product.analysis.similarity
            } : undefined,
            favoritedAt: new Date().toISOString()
          }));
          
          // Store in session storage
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(`k9.session.favorites.${reportId}`, JSON.stringify(favoriteProducts));
          }
          
          setFavorites(favoriteProducts);
          setFavoriteIds(favoriteProducts.map(f => f.id));
          console.log('[Favorites] Loaded', favoriteProducts.length, 'favorites');
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to load favorites:', error);
        setIsInitialized(true);
      }
    };

    if (reportId && !isInitialized) {
      loadFavorites();
    }
  }, [reportId, isInitialized]);

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
      // Optimistic update happens inside toggleFavoriteUtil
      const newIsFavorited = await toggleFavoriteUtil(reportId, product);

      // Update state immediately for responsive UI (this reflects the optimistic update)
      setFavoriteIds(getSessionFavoriteIds(reportId));
      setFavorites(getSessionFavorites(reportId));

      return newIsFavorited;
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      
      // Update state to reflect the rollback that happened in toggleFavoriteUtil
      setFavoriteIds(getSessionFavoriteIds(reportId));
      setFavorites(getSessionFavorites(reportId));
      
      // Show user feedback that the action failed
      // You could dispatch a toast notification here
      console.warn('Favorite action failed and was rolled back. Please try again.');
      
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