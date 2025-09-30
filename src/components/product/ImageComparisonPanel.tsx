'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ProductImage } from '@/types/report';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageComparisonPanelProps {
  selectedProductImages: ProductImage[];
  referenceProductImages: ProductImage[];
  selectedProductName: string;
  referenceProductName: string;
}

interface ImageViewerProps {
  images: ProductImage[];
  title: string;
  onImageSelect: (index: number) => void;
  selectedIndex: number;
}

function ImageViewer({ images, title, onImageSelect, selectedIndex }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);

  const nextImage = () => {
    onImageSelect((selectedIndex + 1) % images.length);
  };

  const prevImage = () => {
    onImageSelect(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.5));
  };

  if (images.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">No images available</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">{title}</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="p-1 rounded hover:bg-gray-100"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded hover:bg-gray-100"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Image Display */}
      <div className="flex-1 relative overflow-hidden bg-gray-50">
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="relative max-w-full max-h-full"
            style={{ transform: `scale(${zoom})` }}
          >
            <Image
              src={images[selectedIndex].url}
              alt={`${title} - Image ${selectedIndex + 1}`}
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: '70vh' }}
              unoptimized
            />
          </div>
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
          {selectedIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="px-4 py-3 bg-white border-t border-gray-200">
          <div className="flex space-x-2 overflow-x-auto">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => onImageSelect(index)}
                className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                  index === selectedIndex 
                    ? 'border-blue-500' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Image
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ImageComparisonPanel({
  selectedProductImages,
  referenceProductImages,
  selectedProductName,
  referenceProductName
}: ImageComparisonPanelProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [referenceImageIndex, setReferenceImageIndex] = useState(0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Image Comparison</h2>
        <p className="text-sm text-gray-600 mt-1">
          Compare product images side by side
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="flex-1 grid grid-cols-2 gap-px bg-gray-300">
        {/* Selected Product Images */}
        <div className="bg-white">
          <ImageViewer
            images={selectedProductImages}
            title={selectedProductName}
            onImageSelect={setSelectedImageIndex}
            selectedIndex={selectedImageIndex}
          />
        </div>

        {/* Reference Product Images */}
        <div className="bg-white">
          <ImageViewer
            images={referenceProductImages}
            title={`Reference: ${referenceProductName}`}
            onImageSelect={setReferenceImageIndex}
            selectedIndex={referenceImageIndex}
          />
        </div>
      </div>
    </div>
  );
}