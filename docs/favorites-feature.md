# Favorites Feature Documentation

## Overview
The favorites feature allows users to mark products as favorites and view them in a dedicated favorites view. Favorites are persisted in localStorage and remain available across browser sessions.

## Project Structure

### Data Layer (`/src/data/`)
- `mockSearchResults.ts` - Mock data for development and testing
- `reports.ts` - Existing reports data

### Core Components

### 1. Favorites Storage (`/src/lib/utils/favorites.ts`)
- `getFavorites()` - Get all favorite products
- `getFavoriteIds()` - Get array of favorite product IDs
- `addToFavorites(product)` - Add a product to favorites
- `removeFromFavorites(productId)` - Remove a product from favorites
- `toggleFavorite(product)` - Toggle favorite status
- `isFavorited(productId)` - Check if product is favorited

### 2. Favorites Hook (`/src/hooks/useFavorites.ts`)
React hook that provides:
- `favorites` - Array of favorite products
- `favoriteIds` - Array of favorite product IDs  
- `isFavorited(productId)` - Check favorite status
- `toggleFavorite(product)` - Toggle favorite with reactive state updates

### 3. Updated SearchResults Component
- Heart icon on each product card for favoriting
- Toggle between Grid view and Favorites view
- Persistent favorites across searches
- Visual feedback for favorited items
- **Color-coded similarity scores** in both views:
  - 90-100%: Green (Excellent)
  - 80-89%: Light Green (Good) 
  - 70-79%: Yellow (Fair)
  - 60-69%: Orange (Poor)
  - Below 60%: Red (Very Poor)
- **Smart sorting**: Products are sorted by similarity (highest first), then alphabetically by name
- **Updated terminology**: "Search Similar Products" instead of "Search Similar Reports"

## Usage

### In SearchResults Component:
```tsx
const { favorites, isFavorited, toggleFavorite } = useFavorites();

// Check if favorited
const isProductFavorited = isFavorited(product.id);

// Toggle favorite status
const handleFavoriteClick = (e, product) => {
  e.stopPropagation();
  toggleFavorite(product);
};
```

### View Modes:
- **Grid View**: Shows search results with heart icons
- **Favorites View**: Shows only favorited products in grid layout

## Storage
- Uses localStorage with key `k9.favorites`
- Stores complete product information for offline viewing
- Includes timestamp for potential future sorting/analytics
- Syncs across browser tabs using storage events

## Styling
Professional, minimal card design with improved visual hierarchy:
- **Borderless cards** with subtle shadows and hover effects
- **Hierarchical product names** with semi-translucent chevron separators (Brand › Series › Model)
- **Horizontal layout** with similarity score on left, product name on right (below image)
- **Improved color scheme** with better contrast and modern colors
- **Tighter spacing** for more professional layout

### Similarity Color Scheme (Outline Style):
- **Excellent (90-100%)**: Emerald green outline (#10b981)
- **Good (80-89%)**: Green outline (#22c55e)  
- **Fair (70-79%)**: Amber outline (#f59e0b)
- **Poor (60-69%)**: Orange outline (#f97316)
- **Very Poor (<60%)**: Red outline (#ef4444)