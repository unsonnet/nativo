/**
 * Utilities for managing favorited products in localStorage
 */

const FAVORITES_STORAGE_KEY = 'k9.favorites';

export interface FavoriteProduct {
  id: string;
  brand: string;
  series?: string;
  model: string;
  image: string;
  favoritedAt: string; // ISO timestamp
}

/**
 * Get all favorited product IDs from localStorage
 */
export function getFavoriteIds(): string[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!stored) return [];
    const favorites: FavoriteProduct[] = JSON.parse(stored);
    return favorites.map(f => f.id);
  } catch (error) {
    console.warn('Failed to load favorites from localStorage:', error);
    return [];
  }
}

/**
 * Get all favorited products from localStorage
 */
export function getFavorites(): FavoriteProduct[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.warn('Failed to load favorites from localStorage:', error);
    return [];
  }
}

/**
 * Add a product to favorites
 */
export function addToFavorites(product: {
  id: string;
  brand: string;
  series?: string;
  model: string;
  image: string;
}): void {
  try {
    if (typeof window === 'undefined') return;
    
    const favorites = getFavorites();
    const exists = favorites.some(f => f.id === product.id);
    
    if (!exists) {
      const newFavorite: FavoriteProduct = {
        ...product,
        favoritedAt: new Date().toISOString()
      };
      
      const updatedFavorites = [...favorites, newFavorite];
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updatedFavorites));
    }
  } catch (error) {
    console.warn('Failed to add product to favorites:', error);
  }
}

/**
 * Remove a product from favorites
 */
export function removeFromFavorites(productId: string): void {
  try {
    if (typeof window === 'undefined') return;
    
    const favorites = getFavorites();
    const updatedFavorites = favorites.filter(f => f.id !== productId);
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updatedFavorites));
  } catch (error) {
    console.warn('Failed to remove product from favorites:', error);
  }
}

/**
 * Check if a product is favorited
 */
export function isFavorited(productId: string): boolean {
  const favoriteIds = getFavoriteIds();
  return favoriteIds.includes(productId);
}

/**
 * Toggle favorite status of a product
 */
export function toggleFavorite(product: {
  id: string;
  brand: string;
  series?: string;
  model: string;
  image: string;
}): boolean {
  const isCurrentlyFavorited = isFavorited(product.id);
  
  if (isCurrentlyFavorited) {
    removeFromFavorites(product.id);
    return false;
  } else {
    addToFavorites(product);
    return true;
  }
}