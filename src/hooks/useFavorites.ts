import { useState, useEffect, useCallback } from 'react';
import type { ProductIndex } from '@/types/report';
import {
  getFavorites,
  getFavoriteIds,
  toggleFavorite as toggleFavoriteUtil,
  type FavoriteProduct
} from '@/lib/utils/favorites';

export function useFavorites(reportId: string) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);

  // Load favorites on mount
  useEffect(() => {
    const loadFavorites = () => {
      setFavoriteIds(getFavoriteIds(reportId));
      setFavorites(getFavorites(reportId));
    };

    loadFavorites();

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('k9.favorites.')) {
        loadFavorites();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [reportId]);

  const toggleFavorite = useCallback((product: ProductIndex) => {
    const newIsFavorited = toggleFavoriteUtil(reportId, product);

    // Update state immediately for responsive UI
    setFavoriteIds(getFavoriteIds(reportId));
    setFavorites(getFavorites(reportId));

    return newIsFavorited;
  }, [reportId]);

  const isFavorited = useCallback((productId: string) => {
    return favoriteIds.includes(productId);
  }, [favoriteIds]);

  return {
    favorites,
    favoriteIds,
    isFavorited,
    toggleFavorite
  };
}