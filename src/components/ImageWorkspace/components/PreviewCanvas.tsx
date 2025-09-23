'use client';

import Image from 'next/image';
import type { PointerEventHandler, ReactNode, WheelEventHandler } from 'react';
import { useMemo } from 'react';

import type { WorkspaceImage } from '../types';
import type { UseImageMaskingResult } from '../hooks';

export type PreviewCanvasProps = {
  previewRef: React.MutableRefObject<HTMLDivElement | null>;
  imageRef: React.MutableRefObject<HTMLImageElement | null>;
  tintOverlayRef: React.MutableRefObject<HTMLCanvasElement | null>;
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
  dimensions?: { length: number | null; width: number | null; thickness: number | null } | null;
  selectionState?: any | null;
};

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
  dimensions,
  selectionState,
}: PreviewCanvasProps) {
  const previewWidth = previewRef.current?.clientWidth ?? 0;
  const previewHeight = previewRef.current?.clientHeight ?? 0;

  const lassoData = useMemo(() => {
    if (!lassoPreview || !lassoPreview.points.length) {
      return null;
    }

    const segments = lassoPreview.points.map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    );
    const path = segments.join(' ');
    const closed = lassoPreview.points.length > 2 ? `${path} Z` : null;
    const stroke = lassoPreview.tool === 'erase' ? 'rgba(248,113,113,0.9)' : 'rgba(56,189,248,0.9)';
    const fill =
      lassoPreview.tool === 'erase' ? 'rgba(248,113,113,0.08)' : 'rgba(56,189,248,0.08)';

    return {
      path,
      closed,
      stroke,
      fill,
      start: lassoPreview.points[0],
      end: lassoPreview.points[lassoPreview.points.length - 1],
    };
  }, [lassoPreview]);

  return (
    <div className="image-workspace__gallery">
      <div
        ref={previewRef}
        className={`image-workspace__preview${isViewportPanning ? ' image-workspace__preview--panning' : ''}${
          isMaskToolActive ? ' image-workspace__preview--mask' : ''
        }`}
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
          {lassoData && previewWidth > 0 && previewHeight > 0 && (
            <svg
              className="image-workspace__lasso-overlay"
              viewBox={`0 0 ${previewWidth} ${previewHeight}`}
              preserveAspectRatio="none"
            >
              {lassoData.closed && (
                <path d={lassoData.closed} className="image-workspace__lasso-fill" fill={lassoData.fill} />
              )}
              <path
                d={lassoData.path}
                className="image-workspace__lasso-path"
                stroke={lassoData.stroke}
                strokeWidth={2}
                strokeDasharray="6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle
                className="image-workspace__lasso-point"
                cx={lassoData.start.x}
                cy={lassoData.start.y}
                r={4}
                stroke={lassoData.stroke}
                strokeWidth={2}
                fill="#0f172a"
              />
              <circle
                className="image-workspace__lasso-point"
                cx={lassoData.end.x}
                cy={lassoData.end.y}
                r={3}
                fill={lassoData.stroke}
              />
            </svg>
          )}
          {/* Selection rectangle is drawn on the overlay canvas by the overlay hook */}
        </div>
      </div>
      {children}
    </div>
  );
}
