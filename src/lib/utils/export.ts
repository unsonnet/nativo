/**
 * Export utilities for creating ZIP files with favorited products
 */

import JSZip from 'jszip';
import type { Product, ProductImage } from '@/types/report';

/**
 * Download an image from a URL and return as Blob
 * Handles CORS issues by trying multiple approaches
 */
async function downloadImage(url: string): Promise<Blob> {
  try {
    // First try with no-cors mode if the URL is from a different origin
    const response = await fetch(url, {
      mode: 'cors', // Try CORS first
      headers: {
        'Accept': 'image/*,*/*;q=0.8',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    return await response.blob();
  } catch (corsError) {
    // If CORS fails, try no-cors mode (this will work but gives an opaque response)
    try {
      console.warn('CORS failed, trying no-cors mode for image:', url);
      const response = await fetch(url, { 
        mode: 'no-cors',
        headers: {
          'Accept': 'image/*,*/*;q=0.8',
        }
      });
      return await response.blob();
    } catch (error) {
      console.error('Failed to download image with both CORS and no-cors:', error);
      throw new Error(`Could not download image from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Resize an image to maximum dimensions while maintaining aspect ratio
 */
async function resizeImage(imageBlob: Blob, maxWidth: number = 800, maxHeight: number = 600): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const originalOnLoad = () => {
      // Calculate new dimensions maintaining aspect ratio
      const { width: origWidth, height: origHeight } = img;
      let { width: newWidth, height: newHeight } = img;
      
      // Scale down if image is larger than max dimensions
      if (origWidth > maxWidth || origHeight > maxHeight) {
        const widthRatio = maxWidth / origWidth;
        const heightRatio = maxHeight / origHeight;
        const scale = Math.min(widthRatio, heightRatio);
        
        newWidth = Math.round(origWidth * scale);
        newHeight = Math.round(origHeight * scale);
      }
      
      // Set canvas dimensions and draw resized image
      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/jpeg', 0.8); // Use JPEG with 80% quality for smaller file size
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    // Create object URL and load image
    const objectUrl = URL.createObjectURL(imageBlob);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      originalOnLoad();
    };
    
    img.src = objectUrl;
  });
}

/**
 * Generate CSV rows for a product - one row per format/vendor combination
 * Each row contains the full product info plus one specific format/vendor pair
 */
export function generateProductCSVRows(product: Product, rowIndex: number, type: 'REFERENCE' | 'FAVORITE'): Record<string, any>[] {
  const baseProductInfo = {
    row_index: rowIndex,
    type: type,
    brand: product.brand || '',
    series: product.series || '',
    model: product.model || '',
    category_type: product.category.type || '',
    category_material: product.category.material || '',
    category_look: product.category.look || '',
    category_texture: product.category.texture || '',
    category_finish: product.category.finish || '',
    category_edge: product.category.edge || '',
  };

  const rows: Record<string, any>[] = [];

  // If no formats, create one row with just product info
  if (product.formats.length === 0) {
    rows.push({
      ...baseProductInfo,
      format_length_val: '',
      format_length_unit: '',
      format_width_val: '',
      format_width_unit: '',
      format_thickness_val: '',
      format_thickness_unit: '',
      vendor_sku: '',
      vendor_store: '',
      vendor_name: '',
      vendor_price_val: '',
      vendor_price_unit: '',
      vendor_discontinued: '',
      vendor_url: '',
    });
    return rows;
  }

  // Generate one row for each format/vendor combination
  product.formats.forEach((format) => {
    const formatInfo = {
      format_length_val: format.length?.val || '',
      format_length_unit: format.length?.unit || '',
      format_width_val: format.width?.val || '',
      format_width_unit: format.width?.unit || '',
      format_thickness_val: format.thickness?.val || '',
      format_thickness_unit: format.thickness?.unit || '',
    };

    // If no vendors for this format, create one row with format info only
    if (format.vendors.length === 0) {
      rows.push({
        ...baseProductInfo,
        ...formatInfo,
        vendor_sku: '',
        vendor_store: '',
        vendor_name: '',
        vendor_price_val: '',
        vendor_price_unit: '',
        vendor_discontinued: '',
        vendor_url: '',
      });
    } else {
      // Create one row for each vendor in this format
      format.vendors.forEach((vendor) => {
        rows.push({
          ...baseProductInfo,
          ...formatInfo,
          vendor_sku: vendor.sku || '',
          vendor_store: vendor.store || '',
          vendor_name: vendor.name || '',
          vendor_price_val: vendor.price?.val || '',
          vendor_price_unit: vendor.price?.unit || '',
          vendor_discontinued: vendor.discontinued || false,
          vendor_url: vendor.url || '',
        });
      });
    }
  });

  return rows;
}

/**
 * Convert an array of objects to CSV string with row_index as first column
 */
function objectArrayToCSV(data: Record<string, any>[]): string {
  if (data.length === 0) return '';

  // Get all unique keys from all objects
  const allKeys = new Set<string>();
  data.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key));
  });

  // Ensure row_index is first, then sort the rest
  const sortedKeys = Array.from(allKeys);
  const headers = ['row_index', ...sortedKeys.filter(key => key !== 'row_index').sort()];
  
  // Create CSV content
  const csvRows: string[] = [];
  
  // Add headers
  csvRows.push(headers.map(header => `"${header}"`).join(','));
  
  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes
      const stringValue = String(value || '').replace(/"/g, '""');
      return `"${stringValue}"`;
    });
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
}

/**
 * Create a safe folder name from product info
 */
function createFolderName(rowIndex: number, brand: string = '', model: string = ''): string {
  // Clean and limit the brand and model strings
  const cleanBrand = brand.replace(/[^a-zA-Z0-9\s-_]/g, '').trim().substring(0, 20);
  const cleanModel = model.replace(/[^a-zA-Z0-9\s-_]/g, '').trim().substring(0, 30);
  
  let folderName = `${rowIndex.toString().padStart(3, '0')}`;
  if (cleanBrand) folderName += `_${cleanBrand}`;
  if (cleanModel) folderName += `_${cleanModel}`;
  
  // Replace spaces with underscores and ensure no double underscores
  return folderName.replace(/\s+/g, '_').replace(/_+/g, '_');
}

export interface ExportOptions {
  /** Maximum width for image resizing (default: 800) */
  maxImageWidth?: number;
  /** Maximum height for image resizing (default: 600) */
  maxImageHeight?: number;
  /** Whether to include reference product as first row (default: true) */
  includeReference?: boolean;
  /** Progress callback for tracking export progress */
  onProgress?: (current: number, total: number, message: string) => void;
}

/**
 * Export favorited products as a ZIP file
 */
export async function exportFavoritesAsZip(
  favoriteProducts: Product[], // Changed from FavoriteProduct[] to Product[]
  referenceProduct: Product,
  reportTitle: string = 'K9 Report',
  options: ExportOptions = {}
): Promise<Blob> {
  const {
    maxImageWidth = 800,
    maxImageHeight = 600,
    includeReference = true,
    onProgress
  } = options;

  if (favoriteProducts.length === 0) {
    throw new Error('No favorite products to export');
  }

  const zip = new JSZip();
  const csvData: Record<string, any>[] = [];
  
  // Calculate total steps for progress reporting
  const totalProducts = favoriteProducts.length + (includeReference ? 1 : 0);
  const totalImages = favoriteProducts.reduce((sum, p) => sum + p.images.length, 0) + 
                     (includeReference ? referenceProduct.images.length : 0);
  let currentStep = 0;
  const totalSteps = totalProducts + totalImages + 2; // +2 for CSV and ZIP generation

  const reportProgress = (message: string) => {
    if (onProgress) {
      onProgress(currentStep, totalSteps, message);
    }
  };

  // Add reference product as first row if requested
  if (includeReference) {
    reportProgress('Processing reference product...');
    const referenceRows = generateProductCSVRows(referenceProduct, 0, 'REFERENCE');
    csvData.push(...referenceRows);
    currentStep++;

    // Create reference product images folder
    const referenceFolderName = createFolderName(0, referenceProduct.brand, referenceProduct.model);
    const referenceFolder = zip.folder(`images/${referenceFolderName}_REFERENCE`);

    if (referenceFolder && referenceProduct.images.length > 0) {
      for (let i = 0; i < referenceProduct.images.length; i++) {
        const image = referenceProduct.images[i];
        try {
          reportProgress(`Downloading reference image ${i + 1}/${referenceProduct.images.length}...`);
          const imageBlob = await downloadImage(image.url);
          const resizedBlob = await resizeImage(imageBlob, maxImageWidth, maxImageHeight);
          
          const extension = image.url.split('.').pop()?.toLowerCase() || 'jpg';
          const filename = `image_${(i + 1).toString().padStart(2, '0')}.${extension}`;
          
          referenceFolder.file(filename, resizedBlob);
        } catch (error) {
          console.error(`Failed to download reference image ${i + 1}:`, error);
          // Add a note to the folder about the failed image
          referenceFolder.file(`FAILED_image_${(i + 1).toString().padStart(2, '0')}.txt`, 
            `Failed to download image from: ${image.url}\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        currentStep++;
      }
    }
  }

  // Process each favorite product
  for (let productIndex = 0; productIndex < favoriteProducts.length; productIndex++) {
    const product = favoriteProducts[productIndex];
    const rowIndex = includeReference ? productIndex + 1 : productIndex;
    
    reportProgress(`Processing product ${productIndex + 1}/${favoriteProducts.length}: ${product.brand} ${product.model}...`);

    // Add product data to CSV (potentially multiple rows per product)
    const productRows = generateProductCSVRows(product, rowIndex, 'FAVORITE');
    csvData.push(...productRows);
    currentStep++;

    // Create product images folder
    const folderName = createFolderName(rowIndex, product.brand, product.model);
    const productFolder = zip.folder(`images/${folderName}`);

    if (productFolder && product.images.length > 0) {
      for (let i = 0; i < product.images.length; i++) {
        const image = product.images[i];
        try {
          reportProgress(`Downloading image ${i + 1}/${product.images.length} for product ${productIndex + 1}...`);
          const imageBlob = await downloadImage(image.url);
          const resizedBlob = await resizeImage(imageBlob, maxImageWidth, maxImageHeight);
          
          const extension = image.url.split('.').pop()?.toLowerCase() || 'jpg';
          const filename = `image_${(i + 1).toString().padStart(2, '0')}.${extension}`;
          
          productFolder.file(filename, resizedBlob);
        } catch (error) {
          console.error(`Failed to download image ${i + 1} for product ${productIndex + 1}:`, error);
          // Add a note to the folder about the failed image
          productFolder.file(`FAILED_image_${(i + 1).toString().padStart(2, '0')}.txt`, 
            `Failed to download image from: ${image.url}\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        currentStep++;
      }
    }
  }

  // Create CSV file
  reportProgress('Generating CSV file...');
  const csvContent = objectArrayToCSV(csvData);
  zip.file('products.csv', csvContent);
  currentStep++;

  // Add a README file
  const readmeContent = `# ${reportTitle} - Favorites Export

This ZIP file contains:

1. **products.csv** - Product information in CSV format
   - Row index in first column for easy image identification
   - Each product may span multiple rows (one per format/vendor combination)
   - Reference product rows marked with type="REFERENCE"
   - Favorite product rows marked with type="FAVORITE"
   - Product info repeated in each row for easy filtering/sorting
   - Format and vendor details in dedicated columns

2. **images/** folder - Product images organized by folders
   - Each product has its own folder named: {row_index}_{brand}_{model}
   - Images are resized to maximum ${maxImageWidth}x${maxImageHeight} pixels
   - Original aspect ratios are maintained
   - Failed image downloads are noted in FAILED_image_*.txt files

CSV Structure:
- row_index: Identifies which image folder corresponds to this product
- type: "REFERENCE" or "FAVORITE" 
- Product details: brand, series, model, category info
- Format details: length, width, thickness with units
- Vendor details: SKU, store, name, price, discontinued status, URL

Export Details:
- Total CSV rows: ${csvData.length}
- Total products: ${favoriteProducts.length + (includeReference ? 1 : 0)}
- Reference included: ${includeReference ? 'Yes' : 'No'}
- Export date: ${new Date().toISOString()}
- Max image dimensions: ${maxImageWidth}x${maxImageHeight}

Generated by K9 Product Search System
`;

  zip.file('README.txt', readmeContent);

  // Generate the ZIP file
  reportProgress('Generating ZIP file...');
  const zipBlob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6 // Good compression without being too slow
    }
  });
  currentStep++;
  
  reportProgress('Export complete!');
  return zipBlob;
}

/**
 * Create a safe filename from a string
 */
function sanitizeFilename(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .toLowerCase()
    .substring(0, 50) // Limit length
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Trigger download of a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create a safe filename for export based on report title
 */
export function createExportFilename(reportTitle: string): string {
  const sanitizedTitle = sanitizeFilename(reportTitle) || 'k9-report';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  return `k9-favorites-${sanitizedTitle}-${timestamp}.zip`;
}