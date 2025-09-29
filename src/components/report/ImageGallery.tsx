"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { ProductImage } from "@/types/report";

interface ImageGalleryProps {
  images: ProductImage[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [thumbnailStartIndex, setThumbnailStartIndex] = useState(0);
  
  const visibleThumbnailCount = 3; // Reduced for better fit in sidebar
  
  const handlePrevThumbnails = () => {
    setThumbnailStartIndex(Math.max(0, thumbnailStartIndex - 1));
  };
  
  const handleNextThumbnails = () => {
    const maxStartIndex = Math.max(0, images.length - visibleThumbnailCount);
    setThumbnailStartIndex(Math.min(maxStartIndex, thumbnailStartIndex + 1));
  };
  
  const visibleThumbnails = images.slice(
    thumbnailStartIndex, 
    thumbnailStartIndex + visibleThumbnailCount
  );
  
  if (!images || images.length === 0) {
    return (
      <div className="image-gallery">
        <div className="image-gallery__empty">
          <p>No images available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="image-gallery">
      <div className="image-gallery__header">
        <h3 className="image-gallery__title">Selected Report</h3>
      </div>

      {/* Main selected image */}
      <div className="image-gallery__main">
        <div className="image-gallery__main-container">
          <Image
            src={images[selectedIndex]?.url || "/placeholder.svg"}
            alt={`Product image ${selectedIndex + 1}`}
            fill
            className="image-gallery__main-image"
            sizes="300px"
            unoptimized
          />
        </div>
      </div>

      {/* Thumbnail navigation */}
      <div className="image-gallery__thumbnails">
        {images.length > visibleThumbnailCount && (
          <button
            onClick={handlePrevThumbnails}
            disabled={thumbnailStartIndex === 0}
            className="image-gallery__nav-button image-gallery__nav-button--up"
            aria-label="Previous thumbnails"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        )}

        <div className="image-gallery__thumbnail-list">
          {visibleThumbnails.map((image, index) => {
            const actualIndex = thumbnailStartIndex + index;
            return (
              <button
                key={image.id}
                onClick={() => setSelectedIndex(actualIndex)}
                className={`image-gallery__thumbnail ${
                  selectedIndex === actualIndex ? "image-gallery__thumbnail--active" : ""
                }`}
                aria-label={`Select image ${actualIndex + 1}`}
              >
                <Image
                  src={image.url}
                  alt={`Thumbnail ${actualIndex + 1}`}
                  fill
                  className="image-gallery__thumbnail-image"
                  sizes="60px"
                  unoptimized
                />
              </button>
            );
          })}
        </div>

        {images.length > visibleThumbnailCount && (
          <button
            onClick={handleNextThumbnails}
            disabled={thumbnailStartIndex >= images.length - visibleThumbnailCount}
            className="image-gallery__nav-button image-gallery__nav-button--down"
            aria-label="Next thumbnails"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}