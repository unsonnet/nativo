'use client';

import React, { useMemo, useRef, useLayoutEffect } from 'react';

export type DimensionsVals = { length: number | null; width: number | null; thickness: number | null };

type Props = {
  viewWidth: number;
  viewHeight: number;
  imageRef: React.MutableRefObject<HTMLImageElement | null>;
  dimensions: DimensionsVals;
  imageTransform?: string;
};

export function SelectionRectangle({ viewWidth, viewHeight, imageRef, dimensions, imageTransform }: Props) {
  const { length, width } = dimensions;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  const rect = useMemo(() => {
    if (!length || !width) return null;

    const img = imageRef.current;
    const naturalWidth = img?.naturalWidth ?? 1;
    const naturalHeight = img?.naturalHeight ?? 1;

    // compute image content rect inside preview (object-fit: contain)
    const fitScale = Math.min(viewWidth / naturalWidth, viewHeight / naturalHeight);
    if (!Number.isFinite(fitScale) || fitScale <= 0) return null;
    const baseWidth = naturalWidth * fitScale;
    const baseHeight = naturalHeight * fitScale;
    const baseLeft = (viewWidth - baseWidth) / 2;
    const baseTop = (viewHeight - baseHeight) / 2;

    // compute aspect ratio so longest side is horizontal
    const long = Math.max(length, width);
    const short = Math.min(length, width);
    const aspect = long / short; // horizontal:vertical

    // determine size: use a smaller fraction of the image content (22% of smaller dimension)
    const maxBase = Math.min(baseWidth, baseHeight) * 0.22;

    let h = maxBase;
    let w = aspect * h;
    // ensure fits within image content bounds
    if (w > baseWidth) {
      w = baseWidth * 0.9;
      h = w / aspect;
    }
    if (h > baseHeight) {
      h = baseHeight * 0.9;
      w = h * aspect;
    }

    const x = baseLeft + (baseWidth - w) / 2;
    const y = baseTop + (baseHeight - h) / 2;

    return { x, y, w, h };
  }, [length, width, viewWidth, viewHeight, imageRef]);

  // apply the image transform synchronously to the wrapper to match overlay canvas
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    try {
      wrapper.style.transform = imageTransform ?? '';
      wrapper.style.transformOrigin = 'top left';
    } catch (err) {
      // ignore
    }
  }, [imageTransform]);

  if (!rect) return null;

  return (
    <div
      ref={wrapperRef}
      aria-hidden
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: `${viewWidth}px`,
        height: `${viewHeight}px`,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      className="image-workspace__selection-overlay"
    >
      <div
        ref={innerRef}
        style={{
          position: 'absolute',
          left: `${rect.x}px`,
          top: `${rect.y}px`,
          width: `${rect.w}px`,
          height: `${rect.h}px`,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'rgba(56,189,248,0.08)',
            border: '2px solid rgba(56,189,248,0.9)',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}
