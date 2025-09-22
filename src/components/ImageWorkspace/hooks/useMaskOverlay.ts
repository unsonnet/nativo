import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';

import type { ViewportState } from './useViewportTransform';

const MAX_OVERLAY_DIMENSION = 4096;

type OverlayMetrics = {
  left: number;
  top: number;
  width: number;
  height: number;
};
// left/top/width/height = inner image content (CSS px); containerWidth/containerHeight = overlay size
type OverlayMetricsEx = OverlayMetrics & { containerWidth: number; containerHeight: number };

type UseMaskOverlayParams = {
  previewRef: MutableRefObject<HTMLDivElement | null>;
  imageRef: MutableRefObject<HTMLImageElement | null>;
  getTintOverlay: () => HTMLCanvasElement | null;
};

type UseMaskOverlayResult = {
  tintOverlayRef: MutableRefObject<HTMLCanvasElement | null>;
  updateFromViewport: (state: ViewportState) => void;
  forceRedraw: () => void;
  markDirty: () => void;
};

export function useMaskOverlay({
  previewRef,
  imageRef,
  getTintOverlay,
}: UseMaskOverlayParams): UseMaskOverlayResult {
  const tintOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const overlayMetricsRef = useRef<OverlayMetricsEx | null>(null);
  const overlayReadyRef = useRef(false);
  const patternCacheRef = useRef<{ canvas: HTMLCanvasElement; scale: number } | null>(null);
  const lastViewportRef = useRef<ViewportState>({ scale: 1, offset: { x: 0, y: 0 } });

  const ensureStripesPattern = useCallback((scale: number) => {
    const normalizedScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const cached = patternCacheRef.current;
    if (cached && Math.abs(cached.scale - normalizedScale) < 0.001) return cached.canvas;

    const canvas = document.createElement('canvas');
    const size = 36;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, size);
    ctx.lineTo(size, -size * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, size * 1.5);
    ctx.lineTo(size * 1.5, 0);
    ctx.stroke();
    patternCacheRef.current = { canvas, scale: normalizedScale };
    return canvas;
  }, []);

  const updateOverlayMetrics = useCallback(
    (state: ViewportState) => {
      const overlay = tintOverlayRef.current;
      const preview = previewRef.current;
      const img = imageRef.current;
      if (!overlay || !preview || !img) return { metrics: null, sizeChanged: false };

      const tint = getTintOverlay();
      const naturalWidth = tint?.width ?? img.naturalWidth;
      const naturalHeight = tint?.height ?? img.naturalHeight;

      if (!naturalWidth || !naturalHeight) {
        overlay.style.opacity = '0';
        overlayMetricsRef.current = null;
        return { metrics: null, sizeChanged: false };
      }

  // Compute the image content rect inside the preview-layer (object-fit: contain)
  const parentRect = overlay.parentElement?.getBoundingClientRect() ?? preview.getBoundingClientRect();
      if (!parentRect.width || !parentRect.height) {
        overlay.style.opacity = '0';
        overlayMetricsRef.current = null;
        return { metrics: null, sizeChanged: false };
      }
      const fitScale = Math.min(parentRect.width / naturalWidth, parentRect.height / naturalHeight);
      if (!Number.isFinite(fitScale) || fitScale <= 0) {
        overlay.style.opacity = '0';
        overlayMetricsRef.current = null;
        return { metrics: null, sizeChanged: false };
      }

      const baseWidth = naturalWidth * fitScale;
      const baseHeight = naturalHeight * fitScale;
      const baseLeft = (parentRect.width - baseWidth) / 2;
      const baseTop = (parentRect.height - baseHeight) / 2;

  // Untransformed image content metrics (CSS px)
  const left = baseLeft;
  const top = baseTop;
  const width = baseWidth;
  const height = baseHeight;

      const metrics: OverlayMetricsEx = {
        left,
        top,
        width,
        height,
        containerWidth: parentRect.width,
        containerHeight: parentRect.height,
      };

    // Make the overlay cover the preview-layer and copy the image transform
    overlay.style.left = `0px`;
    overlay.style.top = `0px`;
    overlay.style.width = `${Math.ceil(metrics.containerWidth)}px`;
    overlay.style.height = `${Math.ceil(metrics.containerHeight)}px`;

      try {
        overlay.style.transformOrigin = 'top left';
        const imgTransform = (img.style && img.style.transform) || '';
        overlay.style.transform = imgTransform;
      } catch (err) {
        // ignore style errors in environments where style may be readonly
      }

      const previous = overlayMetricsRef.current;
      const sizeChanged =
        !previous ||
        Math.abs(previous.width - metrics.width) > 0.5 ||
        Math.abs(previous.height - metrics.height) > 0.5 ||
        Math.abs(previous.left - metrics.left) > 0.5 ||
        Math.abs(previous.top - metrics.top) > 0.5;

      overlayMetricsRef.current = metrics;
      return { metrics, sizeChanged };
    },
    [getTintOverlay, imageRef, previewRef]
  );

  const redrawOverlay = useCallback(
    (metrics: OverlayMetricsEx, scale: number, force = false) => {
      const overlay = tintOverlayRef.current;
      const tint = getTintOverlay();

      if (!overlay || !metrics || !tint || !tint.width || !tint.height) {
        overlayReadyRef.current = false;
        if (overlay) overlay.style.opacity = '0';
        return;
      }

    const dpr = window.devicePixelRatio || 1;
    const targetW = metrics.containerWidth * dpr;
    const targetH = metrics.containerHeight * dpr;
    const maxDim = Math.max(targetW, targetH);
    const clampRatio = maxDim > MAX_OVERLAY_DIMENSION ? MAX_OVERLAY_DIMENSION / maxDim : 1;
    const renderScale = dpr * clampRatio;
    const pixelW = Math.max(1, Math.ceil(metrics.containerWidth * renderScale));
    const pixelH = Math.max(1, Math.ceil(metrics.containerHeight * renderScale));

      if (overlay.width !== pixelW || overlay.height !== pixelH) {
        overlay.width = pixelW;
        overlay.height = pixelH;
        force = true;
      } else if (!force && overlayReadyRef.current) {
        return;
      }

      const ctx = overlay.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      ctx.save();
    // Scale drawing so canvas pixels map to CSS pixels
    const renderScaleX = pixelW / metrics.containerWidth;
    const renderScaleY = pixelH / metrics.containerHeight;
  ctx.setTransform(renderScaleX, 0, 0, renderScaleY, 0, 0);

  ctx.fillStyle = 'rgba(30, 41, 59, 0.68)';
  ctx.fillRect(0, 0, metrics.containerWidth, metrics.containerHeight);

      const stripes = ensureStripesPattern(scale);
      if (stripes) {
        const pattern = ctx.createPattern(stripes, 'repeat');
        if (pattern) {
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, metrics.containerWidth, metrics.containerHeight);
          ctx.globalAlpha = 1;
        }
      }

    ctx.globalCompositeOperation = 'destination-in';
    const dstLeft = Math.round(metrics.left);
    const dstTop = Math.round(metrics.top);
    const dstWidth = Math.round(metrics.width);
    const dstHeight = Math.round(metrics.height);
    ctx.drawImage(tint, 0, 0, tint.width, tint.height, dstLeft, dstTop, dstWidth, dstHeight);

      ctx.restore();
      overlay.style.opacity = '1';
      overlayReadyRef.current = true;
    },
    [ensureStripesPattern, getTintOverlay]
  );

  const updateFromViewport = useCallback(
    (state: ViewportState) => {
      lastViewportRef.current = state;
      const { metrics, sizeChanged } = updateOverlayMetrics(state);
      if (metrics) {
        redrawOverlay(metrics, state.scale, sizeChanged);
      }
    },
    [redrawOverlay, updateOverlayMetrics]
  );

  const forceRedraw = useCallback(() => {
    const state = lastViewportRef.current;
    const { metrics } = updateOverlayMetrics(state);
    if (metrics) {
      redrawOverlay(metrics, state.scale, true);
    }
  }, [redrawOverlay, updateOverlayMetrics]);

  const markDirty = useCallback(() => {
    overlayReadyRef.current = false;
    const overlay = tintOverlayRef.current;
    if (overlay) overlay.style.opacity = '0';
  }, []);

  return {
    tintOverlayRef,
    updateFromViewport,
    forceRedraw,
    markDirty,
  };
}
