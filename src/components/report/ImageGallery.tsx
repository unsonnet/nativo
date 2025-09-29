"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import type { ProductImage } from "@/types/report";

interface ImageGalleryProps {
  images: ProductImage[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const handlePrevious = () => {
    setSelectedIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
  };
  
  const handleNext = () => {
    setSelectedIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
  };
  
  const goToImage = (index: number) => {
    setSelectedIndex(index);
  };

  if (!images || images.length === 0) {
    return (
      <div className="image-gallery">
        <div className="image-gallery__empty">
          <p>No images available</p>
        </div>
      </div>
    );
  }

  const hasMultipleImages = images.length > 1;

  return (
    <div className="image-gallery">
      <div className="search-filters__header search-filters__header--strip-top">
        <h3 className="search-filters__title">
          <Images className="w-4 h-4" />
          Reference Images
        </h3>
      </div>

      {/* Main image viewer with side navigation */}
      <div className="image-gallery__viewer">
        {/* Left chevron */}
        {hasMultipleImages && (
          <button
            onClick={handlePrevious}
            className="image-gallery__nav image-gallery__nav--left"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Main image container */}
        <div className="image-gallery__main">
          <Image
            src={images[selectedIndex]?.url || "/placeholder.svg"}
            alt={`Product image ${selectedIndex + 1}`}
            fill
            className="image-gallery__main-image"
            sizes="280px"
            unoptimized
          />
        </div>

        {/* Right chevron */}
        {hasMultipleImages && (
          <button
            onClick={handleNext}
            className="image-gallery__nav image-gallery__nav--right"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Dot indicators - now positioned over the image */}
        {hasMultipleImages && (
          <div className="image-gallery__indicators">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                className={`image-gallery__dot ${
                  selectedIndex === index ? "image-gallery__dot--active" : ""
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}