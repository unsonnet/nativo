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
      color: { 
        primary: { vector: [0.8, 0.6], similarity: 95 }, 
        secondary: { vector: [0.7, 0.5], similarity: 88 } 
      },
      pattern: { 
        primary: { vector: [0.9, 0.7], similarity: 92 }, 
        secondary: { vector: [0.8, 0.6], similarity: 85 } 
      },
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
      color: { 
        primary: { vector: [0.7, 0.5], similarity: 87 }, 
        secondary: { vector: [0.6, 0.4], similarity: 82 } 
      },
      pattern: { 
        primary: { vector: [0.8, 0.6], similarity: 89 }, 
        secondary: { vector: [0.7, 0.5], similarity: 84 } 
      },
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
      color: { 
        primary: { vector: [0.9, 0.7], similarity: 96 }, 
        secondary: { vector: [0.8, 0.6], similarity: 91 } 
      },
      pattern: { 
        primary: { vector: [0.85, 0.65], similarity: 93 }, 
        secondary: { vector: [0.75, 0.55], similarity: 88 } 
      },
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
      color: { 
        primary: { vector: [0.75, 0.55], similarity: 86 }, 
        secondary: { vector: [0.65, 0.45], similarity: 81 } 
      },
      pattern: { 
        primary: { vector: [0.9, 0.7], similarity: 90 }, 
        secondary: { vector: [0.8, 0.6], similarity: 85 } 
      },
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
      color: { 
        primary: { vector: [0.85, 0.65], similarity: 92 }, 
        secondary: { vector: [0.75, 0.55], similarity: 87 } 
      },
      pattern: { 
        primary: { vector: [0.88, 0.68], similarity: 94 }, 
        secondary: { vector: [0.78, 0.58], similarity: 89 } 
      },
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
      color: { 
        primary: { vector: [0.82, 0.62], similarity: 78 }, 
        secondary: { vector: [0.72, 0.52], similarity: 73 } 
      },
      pattern: { 
        primary: { vector: [0.86, 0.66], similarity: 80 }, 
        secondary: { vector: [0.76, 0.56], similarity: 75 } 
      },
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
      color: { 
        primary: { vector: [0.77, 0.57], similarity: 71 }, 
        secondary: { vector: [0.67, 0.47], similarity: 66 } 
      },
      pattern: { 
        primary: { vector: [0.83, 0.63], similarity: 74 }, 
        secondary: { vector: [0.73, 0.53], similarity: 69 } 
      },
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
      color: { 
        primary: { vector: [0.88, 0.68], similarity: 94 }, 
        secondary: { vector: [0.78, 0.58], similarity: 89 } 
      },
      pattern: { 
        primary: { vector: [0.92, 0.72], similarity: 96 }, 
        secondary: { vector: [0.82, 0.62], similarity: 91 } 
      },
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