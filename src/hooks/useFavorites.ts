import { useState, useEffect, useCallback } from 'react';
import type { ProductIndex } from '@/types/report';
import {
  getFavorites,
  getFavoriteIds,
  toggleFavorite as toggleFavoriteUtil,
  type FavoriteProduct
} from '@/lib/utils/favorites';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);

  // Load favorites on mount
  useEffect(() => {
    const loadFavorites = () => {
      setFavoriteIds(getFavoriteIds());
      setFavorites(getFavorites());
    };

    loadFavorites();

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'k9.favorites') {
        loadFavorites();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleFavorite = useCallback((product: ProductIndex) => {
    const newIsFavorited = toggleFavoriteUtil({
      id: product.id,
      brand: product.brand,
      series: product.series,
      model: product.model,
      image: product.image
    });

    // Update state immediately for responsive UI
    setFavoriteIds(getFavoriteIds());
    setFavorites(getFavorites());

    return newIsFavorited;
  }, []);

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