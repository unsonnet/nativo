'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import type { PointerEventHandler, ReactNode, WheelEventHandler } from 'react';
import { LassoOverlay } from './overlays/LassoOverlay';
import type { WorkspaceImage } from '../types';
import type { UseImageMaskingResult } from '../hooks';

export type PreviewCanvasProps = {
  previewRef: React.RefObject<HTMLDivElement>;
  imageRef: React.RefObject<HTMLImageElement>;
  tintOverlayRef: React.RefObject<HTMLCanvasElement>;
  selectedImage: WorkspaceImage;
  imageTransform: string;
  isViewportPanning: boolean;
  isMaskToolActive: boolean;
  lassoPreview: UseImageMaskingResult['lassoPreview'];
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onWheel: WheelEventHandler<HTMLDivElement>;
  children?: ReactNode;
};

/**
 * Renders the main image viewport with tint overlay and optional lasso overlay.
 * Handles pointer and wheel events for masking and viewport transforms.
 */
export function PreviewCanvas({
  previewRef,
  imageRef,
  tintOverlayRef,
  selectedImage,
  imageTransform,
  isViewportPanning,
  isMaskToolActive,
  lassoPreview,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  children,
}: PreviewCanvasProps) {
  const width = previewRef.current?.clientWidth ?? 0;
  const height = previewRef.current?.clientHeight ?? 0;

  const lassoData = useMemo(() => {
    if (!lassoPreview?.points.length) return null;
    const path = lassoPreview.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');
    return {
      path,
      closed: lassoPreview.points.length > 2 ? `${path} Z` : null,
      stroke: lassoPreview.tool === 'erase' ? 'rgba(248,113,113,0.9)' : 'rgba(56,189,248,0.9)',
      fill: lassoPreview.tool === 'erase' ? 'rgba(248,113,113,0.08)' : 'rgba(56,189,248,0.08)',
      start: lassoPreview.points[0],
      end: lassoPreview.points[lassoPreview.points.length - 1],
    };
  }, [lassoPreview]);

  return (
    <div className="image-workspace__gallery">
      <div
        ref={previewRef}
        className={`image-workspace__preview${isViewportPanning ? ' image-workspace__preview--panning' : ''}${isMaskToolActive ? ' image-workspace__preview--mask' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="image-workspace__preview-layer">
          <Image
            ref={imageRef}
            src={selectedImage.url}
            alt={selectedImage.name}
            fill
            unoptimized
            sizes="100vw"
            style={{ transform: imageTransform, objectFit: 'contain' }}
          />
          <canvas ref={tintOverlayRef} className="image-workspace__mask-overlay" aria-hidden />
          <LassoOverlay lassoData={lassoData} width={width} height={height} />
        </div>
      </div>
      {children}
    </div>
  );
}
