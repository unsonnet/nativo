'use client';

import { useState } from 'react';
import { Product } from '@/types/report';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ProductInfoPanelProps {
  product: Product;
  referenceProduct: Product;
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
      >
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

interface SimilarityBarProps {
  label: string;
  percentage: number;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

function SimilarityBar({ label, percentage, color = 'blue' }: SimilarityBarProps) {
  const getColorClasses = (colorName: string) => {
    switch (colorName) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const getColorFromPercentage = (pct: number) => {
    if (pct >= 90) return 'green';
    if (pct >= 75) return 'yellow';
    if (pct >= 50) return 'red';
    return 'red';
  };

  // Use provided color or calculate from percentage
  const barColor = color || getColorFromPercentage(percentage);

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-600">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getColorClasses(barColor)}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

export function ProductInfoPanel({ product, referenceProduct }: ProductInfoPanelProps) {
  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h1 className="text-xl font-bold text-gray-900">Product Comparison</h1>
        <p className="text-sm text-gray-600 mt-1">
          {product.brand} {product.series} {product.model}
        </p>
      </div>

      {/* Product Basic Info */}
      <CollapsibleSection title="Product Information" defaultOpen={true}>
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-500">Brand:</span>
            <p className="text-sm text-gray-900">{product.brand}</p>
          </div>
          {product.series && (
            <div>
              <span className="text-sm font-medium text-gray-500">Series:</span>
              <p className="text-sm text-gray-900">{product.series}</p>
            </div>
          )}
          <div>
            <span className="text-sm font-medium text-gray-500">Model:</span>
            <p className="text-sm text-gray-900">{product.model}</p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Similarity Analysis */}
      {product.analysis && (
        <CollapsibleSection title="Similarity Analysis" defaultOpen={true}>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Overall Similarity</h4>
              <SimilarityBar 
                label="Total Match" 
                percentage={Math.round(product.analysis.similarity * 100)} 
              />
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Color Analysis</h4>
              {product.analysis.color.primary.similarity && (
                <SimilarityBar 
                  label="Primary Color" 
                  percentage={product.analysis.color.primary.similarity} 
                />
              )}
              {product.analysis.color.secondary.similarity && (
                <SimilarityBar 
                  label="Secondary Color" 
                  percentage={product.analysis.color.secondary.similarity} 
                />
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Pattern Analysis</h4>
              {product.analysis.pattern.primary.similarity && (
                <SimilarityBar 
                  label="Primary Pattern" 
                  percentage={product.analysis.pattern.primary.similarity} 
                />
              )}
              {product.analysis.pattern.secondary.similarity && (
                <SimilarityBar 
                  label="Secondary Pattern" 
                  percentage={product.analysis.pattern.secondary.similarity} 
                />
              )}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Category Information */}
      <CollapsibleSection title="Category & Material">
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(product.category).map(([key, value]) => (
            value && (
              <div key={key}>
                <span className="text-xs font-medium text-gray-500 capitalize">{key}:</span>
                <p className="text-sm text-gray-900">{value}</p>
              </div>
            )
          ))}
        </div>
      </CollapsibleSection>

      {/* Formats & Pricing */}
      <CollapsibleSection title="Available Formats">
        <div className="space-y-4">
          {product.formats.map((format, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-2 mb-3">
                {format.length && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Length:</span>
                    <p className="text-sm text-gray-900">{format.length.val}{format.length.unit}</p>
                  </div>
                )}
                {format.width && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Width:</span>
                    <p className="text-sm text-gray-900">{format.width.val}{format.width.unit}</p>
                  </div>
                )}
                {format.thickness && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Thickness:</span>
                    <p className="text-sm text-gray-900">{format.thickness.val}{format.thickness.unit}</p>
                  </div>
                )}
              </div>
              
              {format.vendors.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">Available from:</h5>
                  <div className="space-y-2">
                    {format.vendors.map((vendor, vIndex) => (
                      <div key={vIndex} className="bg-gray-50 rounded p-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{vendor.store}</p>
                            <p className="text-xs text-gray-600">{vendor.name}</p>
                            <p className="text-xs text-gray-500">SKU: {vendor.sku}</p>
                          </div>
                          {vendor.price && (
                            <div className="text-right">
                              <p className="text-sm font-semibold text-green-600">
                                ${vendor.price.val.toFixed(2)}
                              </p>
                              {vendor.discontinued && (
                                <p className="text-xs text-red-500">Discontinued</p>
                              )}
                            </div>
                          )}
                        </div>
                        <a
                          href={vendor.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
                        >
                          View Product →
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Reference Comparison */}
      <CollapsibleSection title="vs Reference Product">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Reference Product</h4>
          <p className="text-sm text-gray-900">{referenceProduct.brand} {referenceProduct.model}</p>
          
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="font-medium text-gray-500">Type:</span>
              <p className="text-gray-900">{referenceProduct.category.type}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Material:</span>
              <p className="text-gray-900">{referenceProduct.category.material}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Finish:</span>
              <p className="text-gray-900">{referenceProduct.category.finish}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Edge:</span>
              <p className="text-gray-900">{referenceProduct.category.edge}</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}