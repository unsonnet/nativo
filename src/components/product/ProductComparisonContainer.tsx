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
    // TODO: Replace with actual API calls
    const loadProductData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Mock data for development - replace with actual API calls
        const mockSelectedProduct: Product = {
          id: productId,
          brand: "TimberCraft",
          series: "Artisan Series",
          model: "Classic Oak Heritage",
          images: [
            {
              id: "img1",
              url: "https://picsum.photos/seed/product1/800/600",
            },
            {
              id: "img2", 
              url: "https://picsum.photos/seed/product2/800/600",
            },
            {
              id: "img3",
              url: "https://picsum.photos/seed/product3/800/600",
            }
          ],
          category: {
            type: "Hardwood",
            material: "Oak",
            look: "Traditional",
            texture: "Smooth",
            finish: "Matte",
            edge: "Beveled"
          },
          formats: [
            {
              length: { val: 48, unit: 'in' },
              width: { val: 7, unit: 'in' },
              thickness: { val: 12, unit: 'mm' },
              vendors: [
                {
                  sku: "TC-AOH-48x7",
                  store: "Home Depot",
                  name: "TimberCraft Classic Oak Heritage 48\"x7\"",
                  price: { val: 4.99, unit: 'usd' },
                  url: "https://homedepot.com/product/tc-aoh"
                },
                {
                  sku: "AOH-4807",
                  store: "Lowe's",
                  name: "Classic Oak Heritage Plank",
                  price: { val: 5.25, unit: 'usd' },
                  url: "https://lowes.com/product/aoh"
                }
              ]
            },
            {
              length: { val: 36, unit: 'in' },
              width: { val: 5, unit: 'in' },
              thickness: { val: 12, unit: 'mm' },
              vendors: [
                {
                  sku: "TC-AOH-36x5",
                  store: "Home Depot", 
                  name: "TimberCraft Classic Oak Heritage 36\"x5\"",
                  price: { val: 3.99, unit: 'usd' },
                  url: "https://homedepot.com/product/tc-aoh-36"
                }
              ]
            }
          ],
          analysis: {
            color: { 
              primary: { vector: [0.8, 0.6, 0.4, 0.9], similarity: 95 },
              secondary: { vector: [0.7, 0.5, 0.3, 0.8], similarity: 88 }
            },
            pattern: { 
              primary: { vector: [0.9, 0.7, 0.6, 0.8], similarity: 92 },
              secondary: { vector: [0.8, 0.6, 0.5, 0.7], similarity: 85 }
            },
            similarity: 0.95
          }
        };

        const mockReferenceReport: Report<Product> = {
          id: reportId,
          title: "Office Building 2nd Floor",
          author: "dashboard.user", 
          date: "2025-09-15",
          reference: {
            id: "ref1",
            brand: "Reference Brand",
            series: "Premium Series",
            model: "Executive Oak",
            images: [
              {
                id: "ref-img1",
                url: "https://picsum.photos/seed/reference1/800/600",
              },
              {
                id: "ref-img2",
                url: "https://picsum.photos/seed/reference2/800/600", 
              }
            ],
            category: {
              type: "Hardwood",
              material: "Oak",
              look: "Executive",
              texture: "Smooth",
              finish: "Gloss",
              edge: "Square"
            },
            formats: [
              {
                length: { val: 48, unit: 'in' },
                width: { val: 6, unit: 'in' },
                thickness: { val: 15, unit: 'mm' },
                vendors: []
              }
            ]
          }
        };

        setState({
          selectedProduct: mockSelectedProduct,
          referenceReport: mockReferenceReport,
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