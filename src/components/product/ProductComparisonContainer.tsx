'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Product, Report, ProductImage } from '@/types/report';

// Import components directly to avoid module resolution issues
interface ProductInfoPanelProps {
  product: Product;
}

interface ImageComparisonPanelProps {
  selectedProductImages: ProductImage[];
  referenceProductImages: ProductImage[];
  selectedProductName: string;
  referenceProductName: string;
}

// Temporary placeholder components until we resolve the import issues
function ProductInfoPanel({ product }: ProductInfoPanelProps) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Product Information</h2>
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900">{product.brand} {product.model}</h3>
          <p className="text-sm text-gray-600">{product.series}</p>
        </div>
        
        {product.analysis && (
          <div>
            <h4 className="font-medium mb-2">Similarity Analysis</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Overall Match:</span>
                <span>{Math.round(product.analysis.similarity * 100)}%</span>
              </div>
              {product.analysis.color.primary.similarity && (
                <div className="flex justify-between">
                  <span>Primary Color:</span>
                  <span>{product.analysis.color.primary.similarity}%</span>
                </div>
              )}
              {product.analysis.pattern.primary.similarity && (
                <div className="flex justify-between">
                  <span>Primary Pattern:</span>
                  <span>{product.analysis.pattern.primary.similarity}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <h4 className="font-medium mb-2">Category</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(product.category).map(([key, value]) => (
              value && (
                <div key={key}>
                  <span className="text-gray-500 capitalize">{key}:</span>
                  <span className="ml-1">{value}</span>
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageComparisonPanel({ selectedProductImages, referenceProductImages, selectedProductName, referenceProductName }: ImageComparisonPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Image Comparison</h2>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-4 p-4">
        <div>
          <h3 className="font-medium mb-2">{selectedProductName}</h3>
          <div className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center">
            {selectedProductImages.length > 0 ? (
              <Image 
                src={selectedProductImages[0].url} 
                alt={selectedProductName}
                width={400}
                height={400}
                className="max-w-full max-h-full object-contain"
                unoptimized
              />
            ) : (
              <span className="text-gray-500">No image available</span>
            )}
          </div>
        </div>
        <div>
          <h3 className="font-medium mb-2">{referenceProductName}</h3>
          <div className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center">
            {referenceProductImages.length > 0 ? (
              <Image 
                src={referenceProductImages[0].url} 
                alt={referenceProductName}
                width={400}
                height={400}
                className="max-w-full max-h-full object-contain"
                unoptimized
              />
            ) : (
              <span className="text-gray-500">No image available</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProductComparisonContainerProps {
  reportId: string;
  productId: string;
}

interface ProductComparisonState {
  selectedProduct: Product | null;
  referenceReport: Report<Product> | null;
  loading: boolean;
  error: string | null;
}

export function ProductComparisonContainer({ reportId, productId }: ProductComparisonContainerProps) {
  console.log('🔧 ProductComparisonContainer props:', { reportId, productId });
  
  const [state, setState] = useState<ProductComparisonState>({
    selectedProduct: null,
    referenceReport: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const loadProductData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Use the new mock database system
        const { getProductWithAnalysis } = await import('@/data/mockDatabase');
        const { reportsApi } = await import('@/lib/api/reports');
        
        // Load the reference report first to get the reference product
        const referenceReport = await reportsApi.getFullReport(reportId);
        if (!referenceReport) {
          throw new Error(`Report ${reportId} not found`);
        }

        // Load the selected product using the new database system
        const selectedProduct = getProductWithAnalysis(productId, reportId);
        if (!selectedProduct) {
          throw new Error(`Product ${productId} not found`);
        }

        setState({
          selectedProduct,
          referenceReport,
          loading: false,
          error: null,
        });
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'An error occurred'
        }));
      }
    };

    loadProductData();
  }, [productId, reportId]);

  if (state.loading) {
    return (
      <div className="report-create">
        <aside className="report-create__sidebar">
          <div className="report-create__form">
            <div className="report-form">
              <div className="report-form__body">
                <div className="report-page__loading">
                  <div className="loading-spinner"></div>
                  <p>Loading product comparison...</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
        <div style={{ flex: 1, background: 'var(--background)' }}></div>
      </div>
    );
  }

  if (state.error || !state.selectedProduct || !state.referenceReport) {
    return (
      <div className="report-create">
        <aside className="report-create__sidebar">
          <div className="report-create__form">
            <div className="report-form">
              <div className="report-form__body">
                <div className="report-page__error">
                  <p>{state.error || 'Product not found'}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
        <div style={{ flex: 1, background: 'var(--background)' }}></div>
      </div>
    );
  }

  return (
    <div className="report-create">
      {/* Left Panel - Product Information */}
      <aside className="report-create__sidebar">
        <div className="report-create__form">
          <div className="report-form">
            <div className="report-form__body">
              <ProductInfoPanel 
                product={state.selectedProduct}
              />
            </div>
          </div>
        </div>
      </aside>
      
      {/* Right Panel - Image Comparison */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ImageComparisonPanel
          selectedProductImages={state.selectedProduct.images}
          referenceProductImages={state.referenceReport.reference.images}
          selectedProductName={`${state.selectedProduct.brand} ${state.selectedProduct.model}`}
          referenceProductName={`${state.referenceReport.reference.brand} ${state.referenceReport.reference.model}`}
        />
      </main>
    </div>
  );
}