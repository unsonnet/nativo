/**
 * Simple test for export functionality
 * To run: npm run dev and navigate to /test-export in browser console
 */

import { exportFavoritesAsZip, downloadBlob } from '@/lib/utils/export';
import { Product } from '@/types/report';

// Mock data for testing
const mockReferenceProduct: Product = {
  id: 'ref-1',
  brand: 'Test Brand',
  series: 'Test Series',
  model: 'Reference Model',
  images: [
    { id: 'ref-img-1', url: '/placeholder.svg' }, // Using local image for testing
  ],
  category: {
    type: 'flooring',
    material: 'wood',
    look: 'natural',
    texture: 'smooth',
    finish: 'matte',
    edge: 'beveled'
  },
  formats: [
    {
      length: { val: 48, unit: 'in' },
      width: { val: 6, unit: 'in' },
      thickness: { val: 12, unit: 'mm' },
      vendors: [
        {
          sku: 'REF123',
          store: 'Test Store',
          name: 'Reference Product',
          price: { val: 5.99, unit: 'usd' },
          discontinued: false,
          url: 'https://example.com/ref'
        },
        {
          sku: 'REF124',
          store: 'Another Store',
          name: 'Reference Product Alt',
          price: { val: 5.49, unit: 'usd' },
          discontinued: false,
          url: 'https://example.com/ref-alt'
        }
      ]
    },
    {
      length: { val: 36, unit: 'in' },
      width: { val: 6, unit: 'in' },
      thickness: { val: 12, unit: 'mm' },
      vendors: [
        {
          sku: 'REF125',
          store: 'Test Store',
          name: 'Reference Product 36"',
          price: { val: 4.99, unit: 'usd' },
          discontinued: false,
          url: 'https://example.com/ref-36'
        }
      ]
    }
  ]
};

const mockFavoriteProducts: Product[] = [
  {
    id: 'fav-1',
    brand: 'Favorite Brand 1',
    series: 'Favorite Series 1',
    model: 'Favorite Model 1',
    images: [
      { id: 'fav1-img-1', url: '/placeholder.svg' },
    ],
    category: {
      type: 'flooring',
      material: 'wood',
      look: 'rustic',
      texture: 'textured',
      finish: 'satin',
      edge: 'square'
    },
    formats: [
      {
        length: { val: 48, unit: 'in' },
        width: { val: 7, unit: 'in' },
        thickness: { val: 12, unit: 'mm' },
        vendors: [
          {
            sku: 'FAV123',
            store: 'Favorite Store',
            name: 'Favorite Product 1',
            price: { val: 6.99, unit: 'usd' },
            discontinued: false,
            url: 'https://example.com/fav1'
          },
          {
            sku: 'FAV123-B',
            store: 'Budget Store',
            name: 'Favorite Product 1 Budget',
            price: { val: 5.99, unit: 'usd' },
            discontinued: false,
            url: 'https://example.com/fav1-budget'
          }
        ]
      }
    ]
  },
  {
    id: 'fav-2',
    brand: 'Favorite Brand 2',
    model: 'Favorite Model 2',
    images: [
      { id: 'fav2-img-1', url: '/placeholder.svg' },
    ],
    category: {
      type: 'flooring',
      material: 'laminate',
      look: 'wood',
      texture: 'embossed',
      finish: 'gloss',
      edge: 'micro-beveled'
    },
    formats: [
      {
        length: { val: 48, unit: 'in' },
        width: { val: 5, unit: 'in' },
        thickness: { val: 8, unit: 'mm' },
        vendors: [
          {
            sku: 'FAV456',
            store: 'Another Store',
            name: 'Favorite Product 2',
            price: { val: 4.99, unit: 'usd' },
            discontinued: false,
            url: 'https://example.com/fav2'
          }
        ]
      },
      {
        length: { val: 36, unit: 'in' },
        width: { val: 5, unit: 'in' },
        thickness: { val: 8, unit: 'mm' },
        vendors: [
          {
            sku: 'FAV457',
            store: 'Another Store',
            name: 'Favorite Product 2 - 36"',
            price: { val: 3.99, unit: 'usd' },
            discontinued: false,
            url: 'https://example.com/fav2-36'
          },
          {
            sku: 'FAV458',
            store: 'Premium Store',
            name: 'Favorite Product 2 - 36" Premium',
            price: { val: 4.49, unit: 'usd' },
            discontinued: false,
            url: 'https://example.com/fav2-36-premium'
          }
        ]
      }
    ]
  }
];

/**
 * Test the export functionality
 */
export async function testExport() {
  console.log('Starting export test...');
  
  try {
    // First, let's show what the CSV structure will look like
    console.log('\n=== CSV Structure Preview ===');
    
    // Import the CSV generation function to test it
    const { generateProductCSVRows } = await import('@/lib/utils/export');
    
    // Generate reference rows
    const refRows = generateProductCSVRows(mockReferenceProduct, 0, 'REFERENCE');
    console.log('Reference product will generate', refRows.length, 'CSV rows:');
    refRows.forEach((row, i) => {
      console.log(`  Row ${i + 1}:`, {
        row_index: row.row_index,
        type: row.type,
        brand: row.brand,
        model: row.model,
        format_length_val: row.format_length_val,
        format_width_val: row.format_width_val,
        vendor_sku: row.vendor_sku,
        vendor_store: row.vendor_store,
        vendor_price_val: row.vendor_price_val
      });
    });
    
    // Generate favorite rows
    mockFavoriteProducts.forEach((product, productIndex) => {
      const rows = generateProductCSVRows(product, productIndex + 1, 'FAVORITE');
      console.log(`\nFavorite product ${productIndex + 1} (${product.brand} ${product.model}) will generate ${rows.length} CSV rows:`);
      rows.forEach((row, i) => {
        console.log(`  Row ${i + 1}:`, {
          row_index: row.row_index,
          type: row.type,
          brand: row.brand,
          model: row.model,
          format_length_val: row.format_length_val,
          format_width_val: row.format_width_val,
          vendor_sku: row.vendor_sku,
          vendor_store: row.vendor_store,
          vendor_price_val: row.vendor_price_val
        });
      });
    });
    
    console.log('\n=== Starting ZIP Export ===');
    
    const zipBlob = await exportFavoritesAsZip(
      mockFavoriteProducts,
      mockReferenceProduct,
      'Test Report Title',
      {
        maxImageWidth: 400,
        maxImageHeight: 300,
        includeReference: true,
        onProgress: (current, total, message) => {
          const percentage = Math.round((current / total) * 100);
          console.log(`Progress: ${percentage}% (${current}/${total}) - ${message}`);
        }
      }
    );
    
    console.log('Export successful! ZIP size:', zipBlob.size, 'bytes');
    
    // Download the test ZIP with proper filename
    const { createExportFilename } = await import('@/lib/utils/export');
    const filename = createExportFilename('Test Report Title');
    downloadBlob(zipBlob, filename);
    
    console.log(`Test export downloaded as: ${filename}`);
    
    return true;
  } catch (error) {
    console.error('Export test failed:', error);
    return false;
  }
}

// Make test function available globally for easy testing
if (typeof window !== 'undefined') {
  (window as any).testExport = testExport;
  console.log('Export test function available as window.testExport()');
}