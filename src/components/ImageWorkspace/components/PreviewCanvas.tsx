'use client';

import Image from 'next/image';
import type { PointerEventHandler, WheelEventHandler } from 'react';
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
    <div className="report-create__gallery">
      <div
        ref={previewRef}
        className={`report-create__preview${isViewportPanning ? ' report-create__preview--panning' : ''}${
          isMaskToolActive ? ' report-create__preview--mask' : ''
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div className="report-create__preview-layer">
          <Image
            ref={imageRef}
            src={selectedImage.url}
            alt={selectedImage.name}
            fill
            unoptimized
            sizes="100vw"
            style={{ transform: imageTransform, objectFit: 'contain' }}
          />
          <canvas ref={tintOverlayRef} className="report-create__mask-overlay" aria-hidden />
          {lassoData && previewWidth > 0 && previewHeight > 0 && (
            <svg
              className="report-create__lasso-overlay"
              viewBox={`0 0 ${previewWidth} ${previewHeight}`}
              preserveAspectRatio="none"
            >
              {lassoData.closed && (
                <path d={lassoData.closed} className="report-create__lasso-fill" fill={lassoData.fill} />
              )}
              <path
                d={lassoData.path}
                className="report-create__lasso-path"
                stroke={lassoData.stroke}
                strokeWidth={2}
                strokeDasharray="6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle
                className="report-create__lasso-point"
                cx={lassoData.start.x}
                cy={lassoData.start.y}
                r={4}
                stroke={lassoData.stroke}
                strokeWidth={2}
                fill="#0f172a"
              />
              <circle
                className="report-create__lasso-point"
                cx={lassoData.end.x}
                cy={lassoData.end.y}
                r={3}
                fill={lassoData.stroke}
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
