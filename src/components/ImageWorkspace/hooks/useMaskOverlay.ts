import { useCallback, useRef, useEffect } from 'react';
import type { MutableRefObject } from 'react';

import type { ViewportState } from './useViewportTransform';
import { OverlayComposer } from '../utils/overlayComposer';
import { drawMask } from '../utils/drawMask';
import { drawSelection } from '../utils/drawSelection';

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
  maskVisible?: boolean;
  selectionVisible?: boolean;
};

type UseMaskOverlayResult = {
  tintOverlayRef: MutableRefObject<HTMLCanvasElement | null>;
  updateFromViewport: (state: ViewportState) => void;
  forceRedraw: () => void;
  markDirty: () => void;
  setSelectionDimensions: (vals: { length: number | null; width: number | null; thickness: number | null } | null) => void;
};

export function useMaskOverlay({
  previewRef,
  imageRef,
  getTintOverlay,
  maskVisible = true,
  selectionVisible = true,
}: UseMaskOverlayParams): UseMaskOverlayResult {
  const tintOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const selectionRef = useRef<{ length: number | null; width: number | null; thickness: number | null } | null>(null);
  const overlayMetricsRef = useRef<OverlayMetricsEx | null>(null);
  const overlayReadyRef = useRef(false);
  const lastViewportRef = useRef<ViewportState>({ scale: 1, offset: { x: 0, y: 0 } });
  const rafRef = useRef<number | null>(null);
  const composerRef = useRef<OverlayComposer | null>(null);
  const selectionVisibleRef = useRef<boolean>(selectionVisible);

  useEffect(() => {
    selectionVisibleRef.current = selectionVisible;
  }, [selectionVisible]);

  useEffect(() => {
    const c = new OverlayComposer();
    c.addDrawer((ctx, metrics, opts) => drawMask(ctx as any, metrics as any, opts.tint, opts.img, opts.maskVisible, opts.scale));
    // only draw selection when explicitly visible and selection values exist
    c.addDrawer((ctx, metrics, opts) => {
      if (!opts || opts.selectionVisible === false) return;
      if (!opts.selection) return;
      drawSelection(ctx as any, metrics as any, opts.selection);
    });
    composerRef.current = c;
    return () => {
      composerRef.current = null;
    };
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

      if (!overlay || !metrics) {
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

      // compose overlay (mask + selection)
      try {
        const img = imageRef.current;
        const composer = composerRef.current;
        if (composer) {
          composer.compose(ctx as any, metrics as any, {
            tint,
            img,
            maskVisible,
            selectionVisible: selectionVisibleRef.current,
            scale,
            selection: selectionRef.current,
          });
        }
      } catch (err) {
        // ignore
      }

      ctx.restore();
      // selection is drawn by overlayCompose above
      overlay.style.opacity = '1';
      overlayReadyRef.current = true;
    },
    [getTintOverlay, maskVisible, imageRef]
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

  // No DPR mousemove listener: prefer explicit redraw scheduling so layout
  // measurements happen after paint. This avoids depending on monitor-change
  // heuristics and keeps the overlay focused on centering the selection.

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
    setSelectionDimensions: (vals: { length: number | null; width: number | null; thickness: number | null } | null) => {
      selectionRef.current = vals;
      // schedule redraw on next animation frame so DOM layout and transforms
      // have settled (prevents mis-centering races)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      rafRef.current = requestAnimationFrame(() => {
        try {
          const state = lastViewportRef.current;
          const { metrics } = updateOverlayMetrics(state);
          if (metrics) {
            redrawOverlay(metrics, state.scale, true);
          }
        } catch (err) {
          // ignore
        }
        rafRef.current = null;
      });
    },
  };
}
