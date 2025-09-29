import type { ProductIndex } from '@/types/report';

/**
 * Mock search results for development and testing
 * In production, this would be replaced with actual API calls
 */
export const mockSearchResults: ProductIndex[] = [
  {
    id: "search_result_1",
    brand: "TimberCraft",
    series: "Artisan Series",
    model: "Classic Oak Heritage",
    image: "https://picsum.photos/seed/result1/400/400",
    analysis: {
      color: { primary: [0.8, 0.6], secondary: [0.7, 0.5] },
      pattern: { primary: [0.9, 0.7], secondary: [0.8, 0.6] },
      similarity: 0.95
    }
  },
  {
    id: "search_result_2", 
    brand: "WoodWorks",
    series: "Heritage Collection",
    model: "Rustic Oak Plank",
    image: "https://picsum.photos/seed/result2/400/400",
    analysis: {
      color: { primary: [0.7, 0.5], secondary: [0.6, 0.4] },
      pattern: { primary: [0.8, 0.6], secondary: [0.7, 0.5] },
      similarity: 0.85
    }
  },
  {
    id: "search_result_3",
    brand: "FloorMaster",
    series: "Executive Line",
    model: "Golden Oak Select",
    image: "https://picsum.photos/seed/result3/400/400",
    analysis: {
      color: { primary: [0.9, 0.7], secondary: [0.8, 0.6] },
      pattern: { primary: [0.85, 0.65], secondary: [0.75, 0.55] },
      similarity: 0.95
    }
  },
  {
    id: "search_result_4",
    brand: "NaturalCraft",
    series: "Vintage Collection",
    model: "Antique Oak Wide Plank",
    image: "https://picsum.photos/seed/result4/400/400",
    analysis: {
      color: { primary: [0.75, 0.55], secondary: [0.65, 0.45] },
      pattern: { primary: [0.9, 0.7], secondary: [0.8, 0.6] },
      similarity: 0.84
    }
  },
  {
    id: "search_result_5",
    brand: "Premier Flooring",
    series: "Signature Series", 
    model: "European Oak Classic",
    image: "https://picsum.photos/seed/result5/400/400",
    analysis: {
      color: { primary: [0.85, 0.65], secondary: [0.75, 0.55] },
      pattern: { primary: [0.88, 0.68], secondary: [0.78, 0.58] },
      similarity: 0.91
    }
  },
  {
    id: "search_result_6",
    brand: "Luxury Floors",
    series: "Premium Collection",
    model: "Royal Oak Engineered",
    image: "https://picsum.photos/seed/result6/400/400",
    analysis: {
      color: { primary: [0.82, 0.62], secondary: [0.72, 0.52] },
      pattern: { primary: [0.86, 0.66], secondary: [0.76, 0.56] },
      similarity: 0.75
    }
  },
  {
    id: "search_result_7",
    brand: "EcoWood",
    series: "Sustainable Line",
    model: "Reclaimed Oak Vintage",
    image: "https://picsum.photos/seed/result7/400/400",
    analysis: {
      color: { primary: [0.77, 0.57], secondary: [0.67, 0.47] },
      pattern: { primary: [0.83, 0.63], secondary: [0.73, 0.53] },
      similarity: 0.68
    }
  },
  {
    id: "search_result_8",
    brand: "ModernFloor",
    series: "Contemporary Series",
    model: "Urban Oak Laminate",
    image: "https://picsum.photos/seed/result8/400/400",
    analysis: {
      color: { primary: [0.88, 0.68], secondary: [0.78, 0.58] },
      pattern: { primary: [0.92, 0.72], secondary: [0.82, 0.62] },
      similarity: 0.93
    }
  }
];

/**
 * Simulate API delay for realistic development experience
 */
export const simulateApiDelay = (ms: number = 1000): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};