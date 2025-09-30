import type { Product, ProductIndex, MiniEmbedding } from '@/types/report';

/**
 * Mock database of base products (without analysis)
 * This simulates what would come from your REST API
 */
export const mockProductsDatabase: Product[] = [
  {
    id: "p1",
    brand: "TimberCraft",
    series: "Artisan Series",
    model: "Classic Oak Heritage",
    images: [
      {
        id: "img_p1_1",
        url: "https://picsum.photos/seed/timber1/800/800",
      },
      {
        id: "img_p1_2", 
        url: "https://picsum.photos/seed/timber1alt/800/800",
      }
    ],
    category: {
      type: "Hardwood",
      material: "Oak",
      look: "Rustic",
      texture: "Smooth",
      finish: "Matte",
      edge: "Beveled"
    },
    formats: [
      {
        length: { val: 72, unit: 'in' },
        width: { val: 5, unit: 'in' },
        thickness: { val: 12, unit: 'mm' },
        vendors: [
          {
            sku: "TC-AOH-001",
            store: "FloorMart",
            name: "TimberCraft Classic Oak Heritage",
            price: { val: 8.99, unit: 'usd' },
            url: "https://example.com/products/tc-aoh-001"
          },
          {
            sku: "AOH-TC-72x5",
            store: "BuildDepot",
            name: "Artisan Oak Heritage Plank",
            price: { val: 9.49, unit: 'usd' },
            url: "https://example.com/products/aoh-tc-72x5"
          }
        ]
      }
    ]
  },
  {
    id: "p2",
    brand: "WoodWorks", 
    series: "Heritage Collection",
    model: "Rustic Oak Plank",
    images: [
      {
        id: "img_p2_1",
        url: "https://picsum.photos/seed/woodworks1/800/800",
      }
    ],
    category: {
      type: "Engineered",
      material: "Oak",
      look: "Rustic",
      texture: "Wire-brushed",
      finish: "Oil",
      edge: "Micro-beveled"
    },
    formats: [
      {
        length: { val: 84, unit: 'in' },
        width: { val: 7, unit: 'in' },
        thickness: { val: 15, unit: 'mm' },
        vendors: [
          {
            sku: "WW-ROP-002",
            store: "PremiumFloors",
            name: "WoodWorks Rustic Oak Heritage",
            price: { val: 12.99, unit: 'usd' },
            url: "https://example.com/products/ww-rop-002"
          }
        ]
      }
    ]
  },
  {
    id: "p3",
    brand: "FloorMaster",
    series: "Executive Line",
    model: "Golden Oak Select",
    images: [
      {
        id: "img_p3_1",
        url: "https://picsum.photos/seed/floormaster1/800/800",
      },
      {
        id: "img_p3_2",
        url: "https://picsum.photos/seed/floormaster2/800/800",
      }
    ],
    category: {
      type: "Luxury Vinyl",
      material: "Vinyl", 
      look: "Wood-look",
      texture: "Embossed",
      finish: "Low Gloss",
      edge: "Square"
    },
    formats: [
      {
        length: { val: 48, unit: 'in' },
        width: { val: 6, unit: 'in' },
        thickness: { val: 6, unit: 'mm' },
        vendors: [
          {
            sku: "FM-GOS-003",
            store: "FloorMart",
            name: "FloorMaster Golden Oak Select LVP",
            price: { val: 4.99, unit: 'usd' },
            url: "https://example.com/products/fm-gos-003"
          }
        ]
      }
    ]
  },
  {
    id: "p4",
    brand: "NaturalCraft",
    series: "Vintage Collection", 
    model: "Antique Oak Wide Plank",
    images: [
      {
        id: "img_p4_1",
        url: "https://picsum.photos/seed/naturalcraft1/800/800",
      }
    ],
    category: {
      type: "Reclaimed",
      material: "Oak",
      look: "Distressed",
      texture: "Hand-scraped", 
      finish: "Natural",
      edge: "Pillowed"
    },
    formats: [
      {
        length: { val: 96, unit: 'in' },
        width: { val: 8, unit: 'in' },
        thickness: { val: 18, unit: 'mm' },
        vendors: [
          {
            sku: "NC-AOWP-004",
            store: "Heritage Woods",
            name: "NaturalCraft Antique Oak Wide Plank",
            price: { val: 18.99, unit: 'usd' },
            url: "https://example.com/products/nc-aowp-004"
          }
        ]
      }
    ]
  },
  {
    id: "p5",
    brand: "Premier Flooring",
    series: "Signature Series",
    model: "European Oak Classic", 
    images: [
      {
        id: "img_p5_1",
        url: "https://picsum.photos/seed/premier1/800/800",
      }
    ],
    category: {
      type: "Solid",
      material: "Oak",
      look: "Traditional",
      texture: "Smooth",
      finish: "Satin",
      edge: "Square"
    },
    formats: [
      {
        length: { val: 72, unit: 'in' },
        width: { val: 5, unit: 'in' },
        thickness: { val: 19, unit: 'mm' },
        vendors: [
          {
            sku: "PF-EOC-005",
            store: "PremiumFloors",
            name: "Premier European Oak Classic",
            price: { val: 15.99, unit: 'usd' },
            url: "https://example.com/products/pf-eoc-005"
          }
        ]
      }
    ]
  },
  {
    id: "p6",
    brand: "Luxury Floors",
    series: "Modern Collection",
    model: "Contemporary Oak",
    images: [
      {
        id: "img_p6_1", 
        url: "https://picsum.photos/seed/luxury1/800/800",
      }
    ],
    category: {
      type: "Engineered",
      material: "Oak",
      look: "Contemporary", 
      texture: "Smooth",
      finish: "UV-Cured",
      edge: "Micro-beveled"
    },
    formats: [
      {
        length: { val: 84, unit: 'in' },
        width: { val: 9, unit: 'in' },
        thickness: { val: 14, unit: 'mm' },
        vendors: [
          {
            sku: "LF-CO-006",
            store: "Designer Floors",
            name: "Luxury Contemporary Oak Wide Plank",
            price: { val: 22.99, unit: 'usd' },
            url: "https://example.com/products/lf-co-006"
          }
        ]
      }
    ]
  },
  {
    id: "p7",
    brand: "BuildCorp",
    series: "Professional Grade",
    model: "Commercial Oak",
    images: [
      {
        id: "img_p7_1",
        url: "https://picsum.photos/seed/buildcorp1/800/800",
      }
    ],
    category: {
      type: "Laminate",
      material: "HDF Core",
      look: "Wood-look",
      texture: "Synchronized",
      finish: "AC4",
      edge: "Click-lock"
    },
    formats: [
      {
        length: { val: 48, unit: 'in' },
        width: { val: 7, unit: 'in' },
        thickness: { val: 8, unit: 'mm' },
        vendors: [
          {
            sku: "BC-CO-007",
            store: "BuildDepot",
            name: "BuildCorp Commercial Oak Laminate",
            price: { val: 3.49, unit: 'usd' },
            url: "https://example.com/products/bc-co-007"
          }
        ]
      }
    ]
  },
  {
    id: "p8",
    brand: "ArtisanCraft",
    series: "Master Collection",
    model: "Handcrafted Oak Elite",
    images: [
      {
        id: "img_p8_1",
        url: "https://picsum.photos/seed/artisan1/800/800",
      },
      {
        id: "img_p8_2",
        url: "https://picsum.photos/seed/artisan2/800/800",
      }
    ],
    category: {
      type: "Solid",
      material: "Oak",
      look: "Artisan",
      texture: "Hand-scraped",
      finish: "Natural Oil",
      edge: "Hand-beveled"
    },
    formats: [
      {
        length: { val: 120, unit: 'in' },
        width: { val: 10, unit: 'in' },
        thickness: { val: 22, unit: 'mm' },
        vendors: [
          {
            sku: "AC-HOE-008",
            store: "Artisan Floors",
            name: "ArtisanCraft Handcrafted Oak Elite",
            price: { val: 28.99, unit: 'usd' },
            url: "https://example.com/products/ac-hoe-008"
          }
        ]
      }
    ]
  }
];

function generateMiniEmbedding(seed: string, similarity?: number): MiniEmbedding {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  hash = ((hash * 1103515245) + 12345) & 0x7fffffff;
  const x = (hash / 0x7fffffff - 0.5) * 2;
  hash = ((hash * 1103515245) + 12345) & 0x7fffffff;
  const y = (hash / 0x7fffffff - 0.5) * 2;
  
  return { 
    vector: [x, y] as [number, number],
    similarity 
  };
}

function generateMiniAnalysisForProduct(productId: string, reportId: string): {
  color: { primary: MiniEmbedding; secondary: MiniEmbedding };
  pattern: { primary: MiniEmbedding; secondary: MiniEmbedding };
  similarity: number;
} {
  const seed = `${productId}_${reportId}`;
  
  // Generate similarity score based on hash
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const similarity = 0.7 + (Math.abs(hash) % 30) / 100; // 0.7 to 0.99
  const primaryColorSim = similarity * 0.95; // 0-1 range, slightly lower than main
  const secondaryColorSim = similarity * 0.90; // 0-1 range, even lower
  const primaryPatternSim = similarity * 0.98; // 0-1 range, very close to main
  const secondaryPatternSim = similarity * 0.85; // 0-1 range, lower
  
  const result = {
    color: {
      primary: generateMiniEmbedding(`${seed}_color_primary`, primaryColorSim),
      secondary: generateMiniEmbedding(`${seed}_color_secondary`, secondaryColorSim)
    },
    pattern: {
      primary: generateMiniEmbedding(`${seed}_pattern_primary`, primaryPatternSim),
      secondary: generateMiniEmbedding(`${seed}_pattern_secondary`, secondaryPatternSim)
    },
    similarity
  };
  
  return result;
}

/**
 * Get a product with analysis for a specific report
 */
export function getProductWithAnalysis(productId: string, reportId: string): Product | undefined {
  const baseProduct = mockProductsDatabase.find(p => p.id === productId);
  if (!baseProduct) return undefined;
  
  return {
    ...baseProduct,
    analysis: generateMiniAnalysisForProduct(productId, reportId)
  };
}

/**
 * Get a ProductIndex with analysis for a specific report
 */
export function getProductIndexWithAnalysis(productId: string, reportId: string): ProductIndex | undefined {
  const baseProduct = mockProductsDatabase.find(p => p.id === productId);
  if (!baseProduct) return undefined;
  
  return {
    id: baseProduct.id,
    brand: baseProduct.brand,
    series: baseProduct.series,
    model: baseProduct.model,
    image: baseProduct.images[0].url, // Use first image
    analysis: generateMiniAnalysisForProduct(productId, reportId)
  };
}

/**
 * Generate search results for a given report (simulates analysis against reference product)
 */
export function generateSearchResultsForReport(reportId: string, referenceProductId: string, count: number = 20): ProductIndex[] {
  // Get all products except the reference
  const availableProducts = mockProductsDatabase.filter(p => p.id !== referenceProductId);
  
  // Sort by similarity to reference (simulated)
  const results = availableProducts.map(product => {
    const analysis = generateMiniAnalysisForProduct(product.id, reportId);
    return {
      id: product.id,
      brand: product.brand,
      series: product.series,
      model: product.model,
      image: product.images[0].url,
      analysis
    };
  }).sort((a, b) => (b.analysis?.similarity || 0) - (a.analysis?.similarity || 0));
  
  return results.slice(0, count);
}

/**
 * Get all products from the database
 */
export function getAllProducts(): Product[] {
  return mockProductsDatabase;
}

/**
 * Get a single product by ID
 */
export function getProductById(id: string): Product | undefined {
  return mockProductsDatabase.find(p => p.id === id);
}