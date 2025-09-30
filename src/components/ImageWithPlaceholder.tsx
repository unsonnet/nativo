"use client";

import Image from "next/image";
import { useState } from "react";

interface ImageWithPlaceholderProps {
  src?: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  unoptimized?: boolean;
  priority?: boolean;
}

export function ImageWithPlaceholder({
  src,
  alt,
  fill,
  width,
  height,
  className = "",
  sizes,
  unoptimized = true,
  priority = false,
}: ImageWithPlaceholderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Use placeholder if no src, error occurred, or while loading
  const shouldShowPlaceholder = !src || hasError;
  const imageSource = shouldShowPlaceholder ? "/placeholder.svg" : src;

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <>
      {/* Loading overlay */}
      {isLoading && !shouldShowPlaceholder && (
        <div 
          className="image-loading-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--control-background, #1e293b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            borderRadius: 'inherit'
          }}
        >
          <div className="loading-spinner" />
        </div>
      )}
      
      <Image
        src={imageSource}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        className={className}
        sizes={sizes}
        unoptimized={unoptimized}
        priority={priority}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          opacity: isLoading && !shouldShowPlaceholder ? 0 : 1,
          transition: 'opacity 0.2s ease-in-out'
        }}
      />
    </>
  );
}