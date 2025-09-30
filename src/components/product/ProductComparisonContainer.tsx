'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Home } from 'lucide-react';
import { Product, Report, ProductImage } from '@/types/report';
import './ProductComparison.css';

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
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [referenceImageIndex, setReferenceImageIndex] = useState(0);
  
  // Store transformations for each image by ID
  const [imageTransforms, setImageTransforms] = useState<{[imageId: string]: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  }}>({});
  
  // Track interaction state
  const [isInteracting, setIsInteracting] = useState<{
    type: 'pan' | 'rotate' | null;
    startX: number;
    startY: number;
    imageId: string;
    initialTransform: {x: number; y: number; scale: number; rotation: number};
    imageCenterX: number;
    imageCenterY: number;
    initialAngle: number;
  } | null>(null);

  // Get transform for a specific image (with defaults)
  const getImageTransform = useCallback((imageId: string) => {
    return imageTransforms[imageId] || { x: 0, y: 0, scale: 1, rotation: 0 };
  }, [imageTransforms]);

  // Update transform for a specific image
  const updateImageTransform = (imageId: string, updates: Partial<{x: number; y: number; scale: number; rotation: number}>) => {
    setImageTransforms(prev => ({
      ...prev,
      [imageId]: { ...getImageTransform(imageId), ...updates }
    }));
  };

  // Check if an image has any transformations applied
  const hasTransformations = useCallback((imageId: string) => {
    const transform = getImageTransform(imageId);
    return transform.x !== 0 || transform.y !== 0 || transform.scale !== 1 || transform.rotation !== 0;
  }, [getImageTransform]);

  // Reset transform for a specific image
  const resetImageTransform = (imageId: string) => {
    setImageTransforms(prev => {
      const newTransforms = { ...prev };
      delete newTransforms[imageId];
      return newTransforms;
    });
  };

  // Handle mouse down (start pan or rotate)
  const handleMouseDown = (e: React.MouseEvent, imageId: string) => {
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const imageCenterX = rect.left + rect.width / 2;
    const imageCenterY = rect.top + rect.height / 2;
    
    // Calculate initial angle for rotation
    const initialAngle = Math.atan2(e.clientY - imageCenterY, e.clientX - imageCenterX) * (180 / Math.PI);
    
    setIsInteracting({
      type: e.button === 0 ? 'pan' : e.button === 2 ? 'rotate' : null,
      startX: e.clientX,
      startY: e.clientY,
      imageId,
      initialTransform: getImageTransform(imageId),
      imageCenterX,
      imageCenterY,
      initialAngle
    });
  };

  // Handle mouse move (perform pan or rotate)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isInteracting) return;
    
    const deltaX = e.clientX - isInteracting.startX;
    const deltaY = e.clientY - isInteracting.startY;
    
    if (isInteracting.type === 'pan') {
      updateImageTransform(isInteracting.imageId, {
        x: isInteracting.initialTransform.x + deltaX,
        y: isInteracting.initialTransform.y + deltaY
      });
    } else if (isInteracting.type === 'rotate') {
      // Calculate current angle from center
      const currentAngle = Math.atan2(e.clientY - isInteracting.imageCenterY, e.clientX - isInteracting.imageCenterX) * (180 / Math.PI);
      const angleDifference = currentAngle - isInteracting.initialAngle;
      
      updateImageTransform(isInteracting.imageId, {
        rotation: isInteracting.initialTransform.rotation + angleDifference
      });
    }
  };

  // Handle mouse up (end interaction)
  const handleMouseUp = () => {
    setIsInteracting(null);
  };

  // Handle wheel (zoom)
  const handleWheel = (e: React.WheelEvent, imageId: string) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const currentTransform = getImageTransform(imageId);
    const newScale = Math.max(0.1, Math.min(5, currentTransform.scale * scaleFactor));
    
    updateImageTransform(imageId, { scale: newScale });
  };

  // Prevent context menu on right click
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Generate transform CSS
  const getTransformStyle = (imageId: string) => {
    const transform = getImageTransform(imageId);
    return {
      transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
      transformOrigin: 'center center',
      transition: isInteracting?.imageId === imageId ? 'none' : 'transform 0.1s ease-out'
    };
  };

  // Add global mouse event listeners
  useEffect(() => {
    if (isInteracting) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - isInteracting.startX;
        const deltaY = e.clientY - isInteracting.startY;
        
        if (isInteracting.type === 'pan') {
          setImageTransforms(prev => ({
            ...prev,
            [isInteracting.imageId]: {
              ...getImageTransform(isInteracting.imageId),
              x: isInteracting.initialTransform.x + deltaX,
              y: isInteracting.initialTransform.y + deltaY
            }
          }));
        } else if (isInteracting.type === 'rotate') {
          // Calculate current angle from center
          const currentAngle = Math.atan2(e.clientY - isInteracting.imageCenterY, e.clientX - isInteracting.imageCenterX) * (180 / Math.PI);
          const angleDifference = currentAngle - isInteracting.initialAngle;
          
          setImageTransforms(prev => ({
            ...prev,
            [isInteracting.imageId]: {
              ...getImageTransform(isInteracting.imageId),
              rotation: isInteracting.initialTransform.rotation + angleDifference
            }
          }));
        }
      };

      const handleGlobalMouseUp = () => {
        setIsInteracting(null);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isInteracting, getImageTransform]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 grid grid-cols-2 p-6 gap-4">
        {/* Reference Product Column */}
        <div className="product-comparison__column">
          <div className="mb-2">
            <h3 className="product-comparison__column-title">{referenceProductName}</h3>
            <span className="product-comparison__reference-label">Reference</span>
          </div>
          <div 
            className="product-comparison__image-container aspect-square flex items-center justify-center"
            onMouseDown={(e) => handleMouseDown(e, referenceProductImages[referenceImageIndex]?.id || 'ref-default')}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={(e) => handleWheel(e, referenceProductImages[referenceImageIndex]?.id || 'ref-default')}
            onContextMenu={handleContextMenu}
            style={{ cursor: isInteracting?.type === 'pan' ? 'grabbing' : isInteracting?.type === 'rotate' ? 'crosshair' : 'grab' }}
          >
            <div className="product-comparison__controls-hint">
              Drag: Pan • Right+Drag: Rotate • Scroll: Zoom
            </div>
            <button
              className="product-comparison__reset-button"
              onClick={(e) => {
                e.stopPropagation();
                resetImageTransform(referenceProductImages[referenceImageIndex]?.id || 'ref-default');
              }}
              aria-label="Reset image transformations"
              style={{ 
                display: hasTransformations(referenceProductImages[referenceImageIndex]?.id || 'ref-default') ? 'flex' : 'none' 
              }}
            >
              <Home className="w-4 h-4" />
            </button>
            {referenceProductImages.length > 0 ? (
              <Image 
                src={referenceProductImages[referenceImageIndex]?.url || referenceProductImages[0].url} 
                alt={referenceProductName}
                width={400}
                height={400}
                className="max-w-full max-h-full object-contain pointer-events-none"
                style={getTransformStyle(referenceProductImages[referenceImageIndex]?.id || 'ref-default')}
                unoptimized
              />
            ) : (
              <span className="text-gray-500">No image available</span>
            )}
          </div>
          
          {/* Reference Product Thumbnails */}
          {referenceProductImages.length > 0 && (
            <div className="product-comparison__thumbnails">
              {referenceProductImages.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setReferenceImageIndex(index)}
                  className={`product-comparison__thumbnail ${
                    index === referenceImageIndex ? 'product-comparison__thumbnail--active' : ''
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={`${referenceProductName} ${index + 1}`}
                    width={64}
                    height={64}
                    className="product-comparison__thumbnail-image"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Product Column */}
        <div className="product-comparison__column">
          <div className="mb-2">
            <h3 className="product-comparison__column-title">{selectedProductName}</h3>
            <span className="product-comparison__product-label">Product</span>
          </div>
          <div 
            className="product-comparison__image-container aspect-square flex items-center justify-center"
            onMouseDown={(e) => handleMouseDown(e, selectedProductImages[selectedImageIndex]?.id || 'sel-default')}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={(e) => handleWheel(e, selectedProductImages[selectedImageIndex]?.id || 'sel-default')}
            onContextMenu={handleContextMenu}
            style={{ cursor: isInteracting?.type === 'pan' ? 'grabbing' : isInteracting?.type === 'rotate' ? 'crosshair' : 'grab' }}
          >
            <div className="product-comparison__controls-hint">
              Drag: Pan • Right+Drag: Rotate • Scroll: Zoom
            </div>
            <button
              className="product-comparison__reset-button"
              onClick={(e) => {
                e.stopPropagation();
                resetImageTransform(selectedProductImages[selectedImageIndex]?.id || 'sel-default');
              }}
              aria-label="Reset image transformations"
              style={{ 
                display: hasTransformations(selectedProductImages[selectedImageIndex]?.id || 'sel-default') ? 'flex' : 'none' 
              }}
            >
              <Home className="w-4 h-4" />
            </button>
            {selectedProductImages.length > 0 ? (
              <Image 
                src={selectedProductImages[selectedImageIndex]?.url || selectedProductImages[0].url} 
                alt={selectedProductName}
                width={400}
                height={400}
                className="max-w-full max-h-full object-contain pointer-events-none"
                style={getTransformStyle(selectedProductImages[selectedImageIndex]?.id || 'sel-default')}
                unoptimized
              />
            ) : (
              <span className="text-gray-500">No image available</span>
            )}
          </div>
          
          {/* Selected Product Thumbnails */}
          {selectedProductImages.length > 0 && (
            <div className="product-comparison__thumbnails">
              {selectedProductImages.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`product-comparison__thumbnail ${
                    index === selectedImageIndex ? 'product-comparison__thumbnail--active' : ''
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={`${selectedProductName} ${index + 1}`}
                    width={64}
                    height={64}
                    className="product-comparison__thumbnail-image"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
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
      {/* Left Panel - Image Comparison */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ImageComparisonPanel
          selectedProductImages={state.selectedProduct.images}
          referenceProductImages={state.referenceReport.reference.images}
          selectedProductName={`${state.selectedProduct.brand} ${state.selectedProduct.model}`}
          referenceProductName={`${state.referenceReport.reference.brand} ${state.referenceReport.reference.model}`}
        />
      </main>
      
      {/* Right Panel - Product Information */}
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
    </div>
  );
}