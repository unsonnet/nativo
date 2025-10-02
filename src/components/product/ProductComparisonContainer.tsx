'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Home, ExternalLink, Info, Images, Copy } from 'lucide-react';
import { Product, Report, ProductImage } from '@/types/report';
import { ReportInfoHeader } from '@/components/report';

import './ProductComparison.css';

// Import components directly to avoid module resolution issues
interface ProductInfoPanelProps {
  product: Product;
}

// Temporary placeholder components until we resolve the import issues
function ProductInfoPanel({ product }: ProductInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<'specs' | 'buy' | 'analysis'>('specs');
  const [expandedFormats, setExpandedFormats] = useState<{ [key: number]: boolean }>({});
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const toggleFormat = (formatIndex: number) => {
    setExpandedFormats(prev => {
      const isCurrentlyExpanded = prev[formatIndex];
      // Close all formats first
      const newState: { [key: number]: boolean } = {};
      // If the clicked format wasn't expanded, open it
      if (!isCurrentlyExpanded) {
        newState[formatIndex] = true;
      }
      return newState;
    });
  };

  const handleTabChange = (newTab: 'specs' | 'buy' | 'analysis') => {
    setActiveTab(newTab);
  };

  const copyToClipboard = async (sku: string, event: React.MouseEvent) => {
    event.preventDefault(); // Prevent link navigation
    event.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(sku);
      setCopiedSku(sku);
      setTimeout(() => setCopiedSku(null), 2000); // Clear after 2 seconds
    } catch (err) {
      console.error('Failed to copy SKU:', err);
    }
  };

  const truncateSku = (sku: string, maxLength: number = 20) => {
    return sku.length > maxLength ? `${sku.substring(0, maxLength)}...` : sku;
  };

  return (
    <div className="search-filters">
      <div className="search-filters__header search-filters__header--strip-top">
        <h3 className="search-filters__title">
          <Info className="w-4 h-4" />
          Product Info
        </h3>
      </div>
      
      <div className="search-filters__header">
        <div className="product-info__header">
          <h3 className="product-info__brand-series">
            {[product.brand, product.series].filter(Boolean).join(' • ')}
          </h3>
          <h2 className="product-info__model">
            {product.model}
          </h2>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="product-info__tabs">
        <button
          className={`product-info__tab ${activeTab === 'specs' ? 'product-info__tab--active' : ''}`}
          onClick={() => handleTabChange('specs')}
        >
          Specs
        </button>
        <button
          className={`product-info__tab ${activeTab === 'buy' ? 'product-info__tab--active' : ''}`}
          onClick={() => handleTabChange('buy')}
        >
          Buy
        </button>
        <button
          className={`product-info__tab ${activeTab === 'analysis' ? 'product-info__tab--active' : ''}`}
          onClick={() => handleTabChange('analysis')}
        >
          Analysis
        </button>
      </div>

      <div className="search-filters__content">
        {/* Specs Tab */}
        {activeTab === 'specs' && (
          <div className="product-info__specs">
            <div className="product-info__formats-header">
              <div className="product-info__section-title">Product Specifications</div>
            </div>
            {Object.entries(product.category).map(([key, value]) => (
              value && (
                <div key={key} className="product-info__spec-row">
                  <span className="product-info__spec-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                  <span className="product-info__spec-value">{value}</span>
                </div>
              )
            ))}
          </div>
        )}

        {/* Buy Tab */}
        {activeTab === 'buy' && (
          <div className="product-info__buy">
            <div className="product-info__formats-header">
              <div className="product-info__section-title">Available Formats</div>
              <div className="product-info__size-info">{product.formats.length} size option{product.formats.length !== 1 ? 's' : ''} available</div>
            </div>
            
            {product.formats.map((format, formatIndex) => {
              const formatDimensions = () => {
                const { length, width, thickness } = format;
                const lengthStr = length?.val ? `${length.val}"` : 'unset';
                const widthStr = width?.val ? `${width.val}"` : 'unset';
                const thicknessStr = thickness?.val ? `${thickness.val}mm` : null;
                
                if (thicknessStr) {
                  return `${lengthStr} × ${widthStr} × ${thicknessStr}`;
                } else {
                  return `${lengthStr} × ${widthStr}`;
                }
              };

              const isExpanded = expandedFormats[formatIndex] || false;

              return (
                <div key={formatIndex} className="product-info__size-option">
                  <div 
                    className="product-info__size-header"
                    onClick={() => toggleFormat(formatIndex)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="product-info__size-label">
                      <span className="product-info__size-text">{formatDimensions()}</span>
                      <span className="product-info__vendor-count">{format.vendors.length} vendor{format.vendors.length !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="product-info__size-toggle">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  
                  {isExpanded && (
                    <div className="product-info__size-details">
                      <div className="product-info__vendor-list">
                        {format.vendors.map((vendor, vendorIndex) => (
                          <div key={vendorIndex} className="product-info__vendor-wrapper">
                            <a 
                              href={vendor.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="product-info__vendor product-info__vendor--link"
                            >
                              <ExternalLink className="product-info__vendor-icon" />
                              <div className="product-info__vendor-content">
                                <div className="product-info__vendor-main-row">
                                  <div className="product-info__vendor-left-info">
                                    <div className="product-info__vendor-name">{vendor.store}</div>
                                  </div>
                                  <div className="product-info__vendor-right-info">
                                    <div className="product-info__vendor-pricing">
                                      {vendor.price ? (
                                        <>
                                          <span className="product-info__price">${vendor.price.val.toFixed(2)}</span>
                                          <span className="product-info__price-unit">/sqft</span>
                                        </>
                                      ) : (
                                        <span className="product-info__price">Contact Store</span>
                                      )}
                                    </div>
                                    <div className="product-info__vendor-status-row">
                                      <span className={`product-info__vendor-status ${
                                        vendor.discontinued === true 
                                          ? 'product-info__vendor-status--out' 
                                          : vendor.discontinued === false 
                                          ? 'product-info__vendor-status--in-stock'
                                          : 'product-info__vendor-status--unknown'
                                      }`}>
                                        {vendor.discontinued === true 
                                          ? 'Discontinued' 
                                          : vendor.discontinued === false 
                                          ? 'Available'
                                          : 'Contact Store'
                                        }
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </a>
                            
                            {/* SKU copy button completely outside the link, positioned to align with store name */}
                            <button
                              type="button"
                              className="product-info__vendor-sku-copy-button"
                              onClick={(e) => copyToClipboard(vendor.sku, e)}
                              title={copiedSku === vendor.sku ? "Copied!" : "Copy SKU"}
                              aria-label="Copy SKU to clipboard"
                            >
                              <span className="product-info__vendor-sku-label">SKU: </span>
                              <span className="product-info__vendor-sku-value" title={vendor.sku}>
                                {truncateSku(vendor.sku)}
                              </span>
                              <Copy className={`product-info__vendor-sku-copy-icon ${copiedSku === vendor.sku ? 'copied' : ''}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && product.analysis && (
          <div className="product-info__analysis">
            <div className="product-info__formats-header">
              <div className="product-info__section-title">Performance Analysis</div>
            </div>
            <div className="product-info__overall-match">
              <div className="product-info__match-header">
                <span className="product-info__match-label">Overall Match</span>
                <span className="product-info__match-percentage">{Math.round(product.analysis.similarity * 100)}%</span>
              </div>
              <div className="product-info__match-bar">
                <div 
                  className="product-info__match-progress" 
                  style={{ width: `${product.analysis.similarity * 100}%` }}
                />
              </div>
              <div className="product-info__match-description">
                {product.analysis.similarity >= 0.8 ? 'Excellent match - highly similar visual characteristics' :
                 product.analysis.similarity >= 0.6 ? 'Good match - similar visual characteristics' :
                 product.analysis.similarity >= 0.4 ? 'Fair match - some similar characteristics' :
                 'Poor match - limited visual similarity'}
              </div>
            </div>

            <div className="product-info__color-section">
              <div className="product-info__section-title">Color</div>
              
              <div className="product-info__color-item">
                <div className="product-info__color-header">
                  <span className="product-info__color-label">Primary</span>
                  <span className="product-info__color-percentage">
                    {Math.round((product.analysis.color.primary.similarity || 0) * 100)}%
                  </span>
                </div>
                <div className="product-info__color-bar">
                  <div 
                    className="product-info__color-progress" 
                    style={{ width: `${(product.analysis.color.primary.similarity || 0) * 100}%` }}
                  />
                </div>
              </div>

              <div className="product-info__color-item">
                <div className="product-info__color-header">
                  <span className="product-info__color-label">Secondary</span>
                  <span className="product-info__color-percentage">
                    {Math.round((product.analysis.color.secondary?.similarity || 0) * 100)}%
                  </span>
                </div>
                <div className="product-info__color-bar">
                  <div 
                    className="product-info__color-progress" 
                    style={{ width: `${(product.analysis.color.secondary?.similarity || 0) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="product-info__pattern-section">
              <div className="product-info__section-title">Pattern</div>
              
              <div className="product-info__pattern-item">
                <div className="product-info__pattern-header">
                  <span className="product-info__pattern-label">Primary</span>
                  <span className="product-info__pattern-percentage">
                    {Math.round((product.analysis.pattern.primary.similarity || 0) * 100)}%
                  </span>
                </div>
                <div className="product-info__pattern-bar">
                  <div 
                    className="product-info__pattern-progress" 
                    style={{ width: `${(product.analysis.pattern.primary.similarity || 0) * 100}%` }}
                  />
                </div>
              </div>

              <div className="product-info__pattern-item">
                <div className="product-info__pattern-header">
                  <span className="product-info__pattern-label">Secondary</span>
                  <span className="product-info__pattern-percentage">
                    {Math.round((product.analysis.pattern.secondary?.similarity || 0) * 100)}%
                  </span>
                </div>
                <div className="product-info__pattern-bar">
                  <div 
                    className="product-info__pattern-progress" 
                    style={{ width: `${(product.analysis.pattern.secondary?.similarity || 0) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ImageComparisonPanelProps {
  selectedProductImages: ProductImage[];
  referenceProductImages: ProductImage[];
  selectedProductName: string;
  referenceProductName: string;
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
      <div className="flex-1 grid grid-cols-2 min-h-0">
        {/* Selected Product Column */}
        <div className="product-comparison__column">
          <div className="search-filters__header product-comparison__image-header flex-shrink-0">
            <h3 className="search-filters__title">
              <Images className="w-4 h-4" />
              Product Images
            </h3>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <div 
              className="product-comparison__image-container flex-1 flex items-center justify-center min-h-0"
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
                  width={0}
                  height={0}
                  className="pointer-events-none"
                  style={{
                    width: 'auto',
                    height: 'auto',
                    maxWidth: '400px',
                    maxHeight: '400px',
                    objectFit: 'contain',
                    ...getTransformStyle(selectedProductImages[selectedImageIndex]?.id || 'sel-default')
                  }}
                  unoptimized
                />
              ) : (
                <span className="text-gray-500">No image available</span>
              )}
            </div>
            
            {/* Selected Product Thumbnails */}
            {selectedProductImages.length > 0 && (
              <div className="product-comparison__thumbnails flex-shrink-0">
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

        {/* Reference Product Column */}
        <div className="product-comparison__column">
          <div className="search-filters__header product-comparison__image-header flex-shrink-0">
            <h3 className="search-filters__title">
              <Images className="w-4 h-4" />
              Reference Images
            </h3>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <div 
              className="product-comparison__image-container flex-1 flex items-center justify-center min-h-0"
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
                  width={0}
                  height={0}
                  className="pointer-events-none"
                  style={{
                    width: 'auto',
                    height: 'auto',
                    maxWidth: '400px',
                    maxHeight: '400px',
                    objectFit: 'contain',
                    ...getTransformStyle(referenceProductImages[referenceImageIndex]?.id || 'ref-default')
                  }}
                  unoptimized
                />
              ) : (
                <span className="text-gray-500">No image available</span>
              )}
            </div>
            
            {/* Reference Product Thumbnails */}
            {referenceProductImages.length > 0 && (
              <div className="product-comparison__thumbnails flex-shrink-0">
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
  const [state, setState] = useState<ProductComparisonState>({
    selectedProduct: null,
    referenceReport: null,
    loading: true,
    error: null,
  });
  
  const loadingRef = useRef(false);

  useEffect(() => {
    const loadProductData = async () => {
      // Prevent duplicate calls (React Strict Mode protection)
      if (loadingRef.current) {
        return;
      }
      loadingRef.current = true;
      
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const { reportsApi } = await import('@/lib/api/reports');
        
        // Load the reference report first to get the reference product
        const referenceReport = await reportsApi.getFullReport(reportId, 'ProductComparisonContainer');
        if (!referenceReport) {
          throw new Error(`Report ${reportId} not found`);
        }

        // Check if we should use real API
        const USE_REAL_API = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';
        
        let selectedProduct: Product;
        
        if (USE_REAL_API) {
          // Use the real API to get the selected product
          const { ReportsApiService } = await import('@/lib/api/reportsApi');
          const productResponse = await ReportsApiService.getProduct(reportId, productId);
          
          if (productResponse.status === 200) {
            selectedProduct = productResponse.body;
          } else {
            throw new Error(productResponse.error || `Product ${productId} not found`);
          }
        } else {
          // Use the mock database system for development
          const { getProductWithAnalysis } = await import('@/data/mockDatabase');
          const mockProduct = getProductWithAnalysis(productId, reportId);
          if (!mockProduct) {
            throw new Error(`Product ${productId} not found`);
          }
          selectedProduct = mockProduct;
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
      } finally {
        loadingRef.current = false;
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
      {/* Left sidebar - Product Information */}
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
      
      {/* Right content area with reference info header and image comparison */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Reference information strip spans the full width */}
        <ReportInfoHeader report={state.referenceReport} />
        
        {/* Image Comparison */}
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