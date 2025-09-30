/**
 * Utilities for managing favorited products in localStorage
 */

import type { ProductIndex } from '@/types/report';

const FAVORITES_STORAGE_KEY = 'k9.favorites';

// Helper to get report-specific storage key
function getReportFavoritesKey(reportId: string): string {
  return `${FAVORITES_STORAGE_KEY}.${reportId}`;
}

export interface FavoriteProduct extends ProductIndex {
  favoritedAt: string; // ISO timestamp
}

/**
 * Get all favorited product IDs from localStorage for a specific report
 */
export function getFavoriteIds(reportId: string): string[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(getReportFavoritesKey(reportId));
    if (!stored) return [];
    const favorites: FavoriteProduct[] = JSON.parse(stored);
    return favorites.map(f => f.id);
  } catch (error) {
    console.warn('Failed to load favorites from localStorage:', error);
    return [];
  }
}

/**
 * Get all favorited products from localStorage for a specific report
 */
export function getFavorites(reportId: string): FavoriteProduct[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(getReportFavoritesKey(reportId));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    
    return parsed;
  } catch (error) {
    console.warn('Failed to load favorites from localStorage:', error);
    return [];
  }
}

/**
 * Add a product to favorites for a specific report
 */
export function addToFavorites(reportId: string, product: ProductIndex): void {
  try {
    if (typeof window === 'undefined') return;
    
    const favorites = getFavorites(reportId);
    const exists = favorites.some(f => f.id === product.id);
    
    if (!exists) {
      const newFavorite: FavoriteProduct = {
        ...product,
        favoritedAt: new Date().toISOString()
      };
      
      const updatedFavorites = [...favorites, newFavorite];
      localStorage.setItem(getReportFavoritesKey(reportId), JSON.stringify(updatedFavorites));
    }
  } catch (error) {
    console.warn('Failed to add product to favorites:', error);
  }
}

/**
 * Remove a product from favorites for a specific report
 */
export function removeFromFavorites(reportId: string, productId: string): void {
  try {
    if (typeof window === 'undefined') return;
    
    const favorites = getFavorites(reportId);
    const updatedFavorites = favorites.filter(f => f.id !== productId);
    localStorage.setItem(getReportFavoritesKey(reportId), JSON.stringify(updatedFavorites));
  } catch (error) {
    console.warn('Failed to remove product from favorites:', error);
  }
}

/**
 * Check if a product is favorited for a specific report
 */
export function isFavorited(reportId: string, productId: string): boolean {
  const favoriteIds = getFavoriteIds(reportId);
  return favoriteIds.includes(productId);
}

/**
 * Toggle favorite status of a product for a specific report
 */
export function toggleFavorite(reportId: string, product: ProductIndex): boolean {
  const isCurrentlyFavorited = isFavorited(reportId, product.id);
  
  if (isCurrentlyFavorited) {
    removeFromFavorites(reportId, product.id);
    return false;
  } else {
    addToFavorites(reportId, product);
    return true;
  }
}