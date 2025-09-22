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
  const overlayMetricsRef = useRef<OverlayMetrics | null>(null);
  const overlayReadyRef = useRef(false);
  const patternCacheRef = useRef<{ canvas: HTMLCanvasElement; scale: number } | null>(null);
  const lastScaleRef = useRef(1);

  const ensureStripesPattern = useCallback((scale: number) => {
    const normalizedScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const cached = patternCacheRef.current;
    if (cached && Math.abs(cached.scale - normalizedScale) < 0.001) {
      return cached.canvas;
    }

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

  const updateOverlayMetrics = useCallback(() => {
    const overlay = tintOverlayRef.current;
    const preview = previewRef.current;
    const img = imageRef.current;
    if (!overlay || !preview || !img) return { metrics: null, sizeChanged: false };

    const imageRect = img.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();

    if (!imageRect.width || !imageRect.height) {
      overlay.style.opacity = '0';
      overlayMetricsRef.current = null;
      return { metrics: null, sizeChanged: false };
    }

    const metrics: OverlayMetrics = {
      left: imageRect.left - previewRect.left,
      top: imageRect.top - previewRect.top,
      width: imageRect.width,
      height: imageRect.height,
    };

    overlay.style.left = `${metrics.left}px`;
    overlay.style.top = `${metrics.top}px`;
    overlay.style.width = `${metrics.width}px`;
    overlay.style.height = `${metrics.height}px`;

    const previous = overlayMetricsRef.current;
    const sizeChanged =
      !previous ||
      Math.abs(previous.width - metrics.width) > 0.5 ||
      Math.abs(previous.height - metrics.height) > 0.5;

    overlayMetricsRef.current = metrics;
    return { metrics, sizeChanged };
  }, [imageRef, previewRef]);

  const redrawOverlay = useCallback(
    (metrics: OverlayMetrics, scale: number, force = false) => {
      const overlay = tintOverlayRef.current;
      const tint = getTintOverlay();

      if (!overlay || !metrics || !tint || !tint.width || !tint.height) {
        overlayReadyRef.current = false;
        if (overlay) overlay.style.opacity = '0';
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const targetW = metrics.width * dpr;
      const targetH = metrics.height * dpr;
      const maxDim = Math.max(targetW, targetH);
      const clampRatio = maxDim > MAX_OVERLAY_DIMENSION ? MAX_OVERLAY_DIMENSION / maxDim : 1;
      const renderScale = dpr * clampRatio;
      const pixelW = Math.max(1, Math.round(metrics.width * renderScale));
      const pixelH = Math.max(1, Math.round(metrics.height * renderScale));

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
      const renderScaleX = pixelW / metrics.width;
      const renderScaleY = pixelH / metrics.height;
      ctx.setTransform(renderScaleX, 0, 0, renderScaleY, 0, 0);

      ctx.fillStyle = 'rgba(30, 41, 59, 0.68)';
      ctx.fillRect(0, 0, metrics.width, metrics.height);

      const stripes = ensureStripesPattern(scale);
      if (stripes) {
        const pattern = ctx.createPattern(stripes, 'repeat');
        if (pattern) {
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, metrics.width, metrics.height);
          ctx.globalAlpha = 1;
        }
      }

      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(tint, 0, 0, tint.width, tint.height, 0, 0, metrics.width, metrics.height);

      ctx.restore();
      overlay.style.opacity = '1';
      overlayReadyRef.current = true;
    },
    [ensureStripesPattern, getTintOverlay]
  );

  const updateFromViewport = useCallback(
    (state: ViewportState) => {
      lastScaleRef.current = state.scale;
      const { metrics, sizeChanged } = updateOverlayMetrics();
      if (metrics) {
        redrawOverlay(metrics, state.scale, sizeChanged);
      }
    },
    [redrawOverlay, updateOverlayMetrics]
  );

  const forceRedraw = useCallback(() => {
    const { metrics } = updateOverlayMetrics();
    if (metrics) {
      redrawOverlay(metrics, lastScaleRef.current, true);
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
