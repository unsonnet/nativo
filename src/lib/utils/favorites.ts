/**
 * Utilities for managing favorited products with API sync
 */

import type { ProductIndex } from '@/types/report';

// Temporary localStorage key for current session only
const SESSION_FAVORITES_KEY = 'k9.session.favorites';

// Helper to get session-specific storage key
function getSessionFavoritesKey(reportId: string): string {
  return `${SESSION_FAVORITES_KEY}.${reportId}`;
}

export interface FavoriteProduct extends ProductIndex {
  favoritedAt: string; // ISO timestamp
}

/**
 * API service for syncing favorites with the database
 */

import { reportsApiService } from '@/lib/api/reportsApi';

// Flag to switch between mock and real API
const USE_REAL_API = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';

export class FavoritesApiService {
  /**
   * Sync favorites to the database
   */
  static async syncFavoritesToDatabase(reportId: string, favoriteIds: string[]): Promise<void> {
    if (USE_REAL_API) {
      try {
        const response = await reportsApiService.syncFavorites(reportId, favoriteIds);
        if (response.status !== 200) {
          throw new Error(response.error || 'Failed to sync favorites');
        }
        console.log(`[API] Synced favorites for report ${reportId}:`, favoriteIds);
      } catch (error) {
        console.error('[API] Failed to sync favorites:', error);
        throw error;
      }
    } else {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log(`[Mock API] Synced favorites for report ${reportId}:`, favoriteIds);
    }
  }

  /**
   * Update individual favorite status
   */
  static async updateFavoriteStatus(reportId: string, productId: string, isFavorite: boolean): Promise<void> {
    if (USE_REAL_API) {
      try {
        const response = await reportsApiService.updateFavoriteStatus(reportId, productId, isFavorite);
        if (response.status !== 200) {
          throw new Error(response.error || 'Failed to update favorite status');
        }
        console.log(`[API] Updated favorite status for ${productId} in report ${reportId}: ${isFavorite}`);
      } catch (error) {
        console.error('[API] Failed to update favorite status:', error);
        throw error;
      }
    } else {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log(`[Mock API] Updated favorite status for ${productId} in report ${reportId}: ${isFavorite}`);
    }
  }

  /**
   * Load favorites from the database (included in report data)
   */
  static async loadFavoritesFromDatabase(reportId: string): Promise<string[]> {
    if (USE_REAL_API) {
      try {
        // In real implementation, favorites would be loaded as part of the report
        // This is just a fallback - normally favorites come with the report data
        const response = await reportsApiService.getReport(reportId);
        if (response.status === 200) {
          return response.body.favorites || [];
        }
        console.warn(`[API] Failed to load report ${reportId}, using empty favorites`);
        return [];
      } catch (error) {
        console.error('[API] Failed to load favorites from database:', error);
        return [];
      }
    } else {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log(`[Mock API] Loading favorites for report ${reportId} (fallback - normally comes with report)`);
      return [];
    }
  }
}

/**
 * Get session-only favorited product IDs for immediate UI feedback
 */
export function getSessionFavoriteIds(reportId: string): string[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = sessionStorage.getItem(getSessionFavoritesKey(reportId));
    if (!stored) return [];
    const favorites: FavoriteProduct[] = JSON.parse(stored);
    return favorites.map(f => f.id);
  } catch (error) {
    console.warn('Failed to load session favorites:', error);
    return [];
  }
}

/**
 * Get session-only favorited products for immediate UI feedback
 */
export function getSessionFavorites(reportId: string): FavoriteProduct[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = sessionStorage.getItem(getSessionFavoritesKey(reportId));
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.warn('Failed to load session favorites:', error);
    return [];
  }
}

/**
 * Add a product to session favorites and sync to database
 */
export async function addToFavorites(reportId: string, product: ProductIndex): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    
    const favorites = getSessionFavorites(reportId);
    const exists = favorites.some(f => f.id === product.id);
    
    if (!exists) {
      const newFavorite: FavoriteProduct = {
        ...product,
        favoritedAt: new Date().toISOString()
      };
      
      const updatedFavorites = [...favorites, newFavorite];
      
      // Update session storage immediately for UI responsiveness
      sessionStorage.setItem(getSessionFavoritesKey(reportId), JSON.stringify(updatedFavorites));
      
      // Sync to database
      const favoriteIds = updatedFavorites.map(f => f.id);
      await FavoritesApiService.syncFavoritesToDatabase(reportId, favoriteIds);
    }
  } catch (error) {
    console.warn('Failed to add product to favorites:', error);
  }
}

/**
 * Remove a product from session favorites and sync to database
 */
export async function removeFromFavorites(reportId: string, productId: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    
    const favorites = getSessionFavorites(reportId);
    const updatedFavorites = favorites.filter(f => f.id !== productId);
    
    // Update session storage immediately for UI responsiveness
    sessionStorage.setItem(getSessionFavoritesKey(reportId), JSON.stringify(updatedFavorites));
    
    // Sync to database
    const favoriteIds = updatedFavorites.map(f => f.id);
    await FavoritesApiService.syncFavoritesToDatabase(reportId, favoriteIds);
  } catch (error) {
    console.warn('Failed to remove product from favorites:', error);
  }
}

/**
 * Check if a product is favorited in current session
 */
export function isFavorited(reportId: string, productId: string): boolean {
  const favoriteIds = getSessionFavoriteIds(reportId);
  return favoriteIds.includes(productId);
}

/**
 * Toggle favorite status of a product and sync to database
 */
export async function toggleFavorite(reportId: string, product: ProductIndex): Promise<boolean> {
  const isCurrentlyFavorited = isFavorited(reportId, product.id);
  
  if (isCurrentlyFavorited) {
    await removeFromFavorites(reportId, product.id);
    return false;
  } else {
    await addToFavorites(reportId, product);
    return true;
  }
}

/**
 * Initialize favorites for a report from database data
 * This should be called when a report is loaded
 */
export function initializeFavoritesFromReport(reportId: string, favorites: string[], searchResults: ProductIndex[]): void {
  try {
    if (typeof window === 'undefined') return;
    
    // Convert favorite IDs to FavoriteProduct objects using search results
    const favoriteProducts: FavoriteProduct[] = favorites.map(id => {
      const product = searchResults.find(p => p.id === id);
      if (product) {
        return {
          ...product,
          favoritedAt: new Date().toISOString() // We don't have the original timestamp
        };
      }
      return null;
    }).filter(Boolean) as FavoriteProduct[];
    
    // Set session storage with database favorites
    sessionStorage.setItem(getSessionFavoritesKey(reportId), JSON.stringify(favoriteProducts));
    
    console.log(`[Favorites] Initialized ${favoriteProducts.length} favorites for report ${reportId}`);
  } catch (error) {
    console.warn('Failed to initialize favorites from report:', error);
  }
}

/**
 * Clear session favorites when leaving a report
 */
export function clearSessionFavorites(reportId: string): void {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(getSessionFavoritesKey(reportId));
    console.log(`[Favorites] Cleared session favorites for report ${reportId}`);
  } catch (error) {
    console.warn('Failed to clear session favorites:', error);
  }
}

/**
 * Clear all session favorites (useful when logging out or changing users)
 */
export function clearAllSessionFavorites(): void {
  try {
    if (typeof window === 'undefined') return;
    
    // Get all keys that start with our session prefix
    const keys = Object.keys(sessionStorage).filter(key => key.startsWith(SESSION_FAVORITES_KEY));
    keys.forEach(key => sessionStorage.removeItem(key));
    
    console.log(`[Favorites] Cleared all session favorites`);
  } catch (error) {
    console.warn('Failed to clear all session favorites:', error);
  }
}