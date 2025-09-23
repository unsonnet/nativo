import { useCallback, useRef, useEffect } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';

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
  selectedImageId?: string | null;
  onSelectionChange?: (state: any | null) => void;
  onPushUndo?: (action: { undo: () => void; redo?: () => void; description?: string }) => void;
};

type UseMaskOverlayResult = {
  tintOverlayRef: MutableRefObject<HTMLCanvasElement | null>;
  updateFromViewport: (state: ViewportState) => void;
  forceRedraw: () => void;
  markDirty: () => void;
  setSelectionDimensions: (vals: { length: number | null; width: number | null; thickness: number | null } | null) => void;
  handleSelectionPointerDown: (e: ReactPointerEvent<HTMLDivElement>, tool: string) => boolean;
  handleSelectionPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => boolean;
  handleSelectionPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => boolean;
  handleSelectionWheel?: (e: WheelEvent) => boolean;
  getSelectionState: () => any | null;
};

export function useMaskOverlay({
  previewRef,
  imageRef,
  getTintOverlay,
  maskVisible = true,
  selectionVisible = true,
  selectedImageId = null,
  onSelectionChange,
  onPushUndo,
}: UseMaskOverlayParams & { onPushUndo?: (action: { undo: () => void; redo?: () => void; description?: string }) => void; }): UseMaskOverlayResult {
  const tintOverlayRef = useRef<HTMLCanvasElement | null>(null);
  // per-image selection state (selection values, offset, scale)
  type SelectionVals = { length: number | null; width: number | null; thickness: number | null } | null;
  type SelectionState = { sel: SelectionVals; offset: { x: number; y: number }; scale: number };
  const selectionMapRef = useRef<Map<string, SelectionState>>(new Map());
  const pointerTracker = useRef<Map<number, any>>(new Map());
  // backward compat when no image id is provided
  const selectionRef = useRef<{ length: number | null; width: number | null; thickness: number | null } | null>(null);
  const overlayMetricsRef = useRef<OverlayMetricsEx | null>(null);
  const overlayReadyRef = useRef(false);
  const lastViewportRef = useRef<ViewportState>({ scale: 1, offset: { x: 0, y: 0 } });
  const rafRef = useRef<number | null>(null);
  const composerRef = useRef<OverlayComposer | null>(null);
  const selectionVisibleRef = useRef<boolean>(selectionVisible);
  const wheelTimeoutRef = useRef<number | null>(null);
  const wheelStartRef = useRef<SelectionState | null>(null);

  useEffect(() => {
    selectionVisibleRef.current = selectionVisible;
  }, [selectionVisible]);
  // Persist selection state per-image so transforms are preserved when switching images
  const STORAGE_PREFIX = 'k9.selection.';
  const loadPersisted = useCallback((id: string) => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + id);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as SelectionState;
    } catch (err) {}
    return null;
  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) window.clearTimeout(wheelTimeoutRef.current);
    };
  }, []);
  }, []);
  const savePersisted = useCallback((id: string, st: SelectionState | null) => {
    try {
      if (!st) {
        localStorage.removeItem(STORAGE_PREFIX + id);
        return;
      }
      localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(st));
    } catch (err) {}
  }, []);

  // Load persisted selection state when selected image changes
  useEffect(() => {
    if (!selectedImageId) return;
    try {
      const persisted = loadPersisted(selectedImageId);
      if (persisted) {
        selectionMapRef.current.set(selectedImageId, persisted);
        try {
          onSelectionChange?.(persisted);
        } catch (err) {}
      }
    } catch (err) {}
  }, [selectedImageId, loadPersisted, onSelectionChange]);

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
          const selState = selectedImageId
            ? selectionMapRef.current.get(selectedImageId) ?? null
            : selectionRef.current
            ? { sel: selectionRef.current, offset: { x: 0, y: 0 }, scale: 1 }
            : null;
          composer.compose(ctx as any, metrics as any, {
            tint,
            img,
            maskVisible,
            selectionVisible: selectionVisibleRef.current,
            scale,
            selection: selState,
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
    [getTintOverlay, maskVisible, imageRef, selectedImageId]
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
      if (!selectedImageId) {
        selectionRef.current = vals;
      } else {
        if (!vals) {
          selectionMapRef.current.delete(selectedImageId);
          savePersisted(selectedImageId, null);
        } else {
          // if a state already exists, preserve its transform
          const prev = selectionMapRef.current.get(selectedImageId) ?? loadPersisted(selectedImageId) ?? { sel: null, offset: { x: 0, y: 0 }, scale: 1 };
          const next: SelectionState = { sel: vals, offset: prev.offset ?? { x: 0, y: 0 }, scale: prev.scale ?? 1 };
          selectionMapRef.current.set(selectedImageId, next);
          savePersisted(selectedImageId, next);
        }
        // notify
        try {
          onSelectionChange?.(selectionMapRef.current.get(selectedImageId) ?? null);
        } catch (err) {}
      }
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
      // Selection pointer handlers: allow interactive translate/scale of selection
      handleSelectionPointerDown: (e: ReactPointerEvent<HTMLDivElement>, tool: string) => {
        const id = e.pointerId;
        // Only respond to left button
        if (e.button !== 0) return false;
        // Only translate/scale when tool is 'translate'
        if (tool !== 'translate') return false;

  const key = selectedImageId ?? '';
  const state = (selectedImageId ? selectionMapRef.current.get(key) : null) ?? (selectionRef.current ? { sel: selectionRef.current, offset: { x: 0, y: 0 }, scale: 1 } : null);
        if (!state) return false;

        // capture pointer on preview so move events come through
        try {
          previewRef.current?.setPointerCapture(id);
        } catch (err) {}

        // store tracker: start positions and initial transform
        pointerTracker.current.set(id, {
          pointerId: id,
          startX: e.clientX,
          startY: e.clientY,
          startOffset: { x: state.offset.x, y: state.offset.y },
          startScale: state.scale,
          mode: e.shiftKey ? 'scale' : 'pan',
          startState: JSON.parse(JSON.stringify(state)),
        });
        return true;
      },
      handleSelectionPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
        const id = e.pointerId;
        const t = pointerTracker.current.get(id);
        if (!t) return false;
        e.preventDefault();
  const dx = e.clientX - t.startX;
  const dy = e.clientY - t.startY;

        // update selection transform for current image
  const key = selectedImageId ?? '';
  const st = (selectedImageId ? selectionMapRef.current.get(key) : null) ?? (selectionRef.current ? { sel: selectionRef.current, offset: { x: 0, y: 0 }, scale: 1 } : null);
        if (!st) return false;

        if (t.mode === 'scale') {
          // scale based on vertical movement (drag up to increase)
          const delta = 1 + dy * -0.002;
          st.scale = Math.max(0.1, t.startScale * delta);
        } else {
          // Adjust pointer delta by the viewport scale so movement is 1:1
          const vs = lastViewportRef.current?.scale ?? 1;
          st.offset = { x: t.startOffset.x + dx / vs, y: t.startOffset.y + dy / vs };
        }

  if (selectedImageId) selectionMapRef.current.set(selectedImageId, st);
  else selectionRef.current = st.sel;

        // notify change
        try {
          onSelectionChange?.((selectedImageId ? selectionMapRef.current.get(selectedImageId) : null) ?? (selectionRef.current ? { sel: selectionRef.current, offset: { x: 0, y: 0 }, scale: 1 } : null));
        } catch (err) {}

        // schedule redraw
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          try {
            const state = lastViewportRef.current;
            const { metrics } = updateOverlayMetrics(state);
            if (metrics) {
              redrawOverlay(metrics, state.scale, true);
            }
          } catch (err) {}
          rafRef.current = null;
        });

        return true;
      },
      handleSelectionPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => {
        const id = e.pointerId;
        const t = pointerTracker.current.get(id);
        if (!t) return false;
        try {
          previewRef.current?.releasePointerCapture(id);
        } catch (err) {}
        pointerTracker.current.delete(id);
        // persist the current selection state for the selected image
        if (selectedImageId) {
          const st = selectionMapRef.current.get(selectedImageId) ?? null;
          try {
            savePersisted(selectedImageId, st);
          } catch (err) {}
          // push undo if transform changed
          try {
            if (onPushUndo && t.startState) {
              const before = t.startState as SelectionState;
              const after = st as SelectionState | null;
              const changed =
                !!after &&
                (before.offset.x !== after.offset.x || before.offset.y !== after.offset.y || before.scale !== after.scale);
              if (changed) {
                const doRedo = () => {
                  selectionMapRef.current.set(selectedImageId!, after!);
                  savePersisted(selectedImageId!, after);
                  try {
                    onSelectionChange?.(after);
                  } catch (err) {}
                  // redraw
                  try {
                    const state = lastViewportRef.current;
                    const { metrics } = updateOverlayMetrics(state);
                    if (metrics) redrawOverlay(metrics, state.scale, true);
                  } catch (err) {}
                };
                const doUndo = () => {
                  selectionMapRef.current.set(selectedImageId!, before);
                  savePersisted(selectedImageId!, before);
                  try {
                    onSelectionChange?.(before);
                  } catch (err) {}
                  try {
                    const state = lastViewportRef.current;
                    const { metrics } = updateOverlayMetrics(state);
                    if (metrics) redrawOverlay(metrics, state.scale, true);
                  } catch (err) {}
                };
                onPushUndo({ undo: doUndo, redo: doRedo, description: 'Move selection' });
              }
            }
          } catch (err) {}
        }
        return true;
      },
      handleSelectionWheel: (e: WheelEvent) => {
        // scale selection when wheel used; positive deltaY -> zoom out
        const key = selectedImageId ?? '';
        const st = (selectedImageId ? selectionMapRef.current.get(key) : null) ?? (selectionRef.current ? { sel: selectionRef.current, offset: { x: 0, y: 0 }, scale: 1 } : null);
        if (!st) return false;
        e.preventDefault();
        const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
        // record start state for undo on first wheel event before we mutate
        try {
          if (selectedImageId && !wheelStartRef.current) {
            const existing = selectionMapRef.current.get(selectedImageId) ?? null;
            wheelStartRef.current = existing ? JSON.parse(JSON.stringify(existing)) : null;
          }
        } catch (err) {}
        const factor = Math.exp(-delta * 0.0015);
        st.scale = Math.max(0.1, Math.min(10, st.scale * factor));
        if (selectedImageId) selectionMapRef.current.set(selectedImageId, st);
        else selectionRef.current = st.sel;
        try {
          onSelectionChange?.((selectedImageId ? selectionMapRef.current.get(selectedImageId) : null) ?? (selectionRef.current ? { sel: selectionRef.current, offset: { x: 0, y: 0 }, scale: 1 } : null));
        } catch (err) {}

        // redraw
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          try {
            const state = lastViewportRef.current;
            const { metrics } = updateOverlayMetrics(state);
            if (metrics) redrawOverlay(metrics, state.scale, true);
          } catch (err) {}
          rafRef.current = null;
        });

        // Persist & push a single undo when wheel activity stops (debounced)
        try {
          if (selectedImageId) {
            // clear previous timeout
            if (wheelTimeoutRef.current) window.clearTimeout(wheelTimeoutRef.current);
            wheelTimeoutRef.current = window.setTimeout(() => {
              const final = selectionMapRef.current.get(selectedImageId) ?? null;
              savePersisted(selectedImageId!, final);
              // push undo if changed
              try {
                if (onPushUndo && wheelStartRef.current) {
                  const before = wheelStartRef.current as SelectionState;
                  const after = final as SelectionState | null;
                  const changed = !!after && (before.scale !== after.scale || before.offset.x !== after.offset.x || before.offset.y !== after.offset.y);
                  if (changed) {
                    const doRedo = () => {
                      selectionMapRef.current.set(selectedImageId!, after!);
                      savePersisted(selectedImageId!, after);
                      try { onSelectionChange?.(after); } catch (err) {}
                      try { const s = lastViewportRef.current; const { metrics } = updateOverlayMetrics(s); if (metrics) redrawOverlay(metrics, s.scale, true); } catch (err) {}
                    };
                    const doUndo = () => {
                      selectionMapRef.current.set(selectedImageId!, before);
                      savePersisted(selectedImageId!, before);
                      try { onSelectionChange?.(before); } catch (err) {}
                      try { const s = lastViewportRef.current; const { metrics } = updateOverlayMetrics(s); if (metrics) redrawOverlay(metrics, s.scale, true); } catch (err) {}
                    };
                    onPushUndo({ undo: doUndo, redo: doRedo, description: 'Scale selection' });
                  }
                }
              } catch (err) {}
              wheelStartRef.current = null;
              wheelTimeoutRef.current = null;
            }, 150);
          }
        } catch (err) {}

        return true;
      },
    getSelectionState: () => {
      if (!selectedImageId) {
        if (selectionRef.current) return { sel: selectionRef.current, offset: { x: 0, y: 0 }, scale: 1 };
        return null;
      }
      const st = selectionMapRef.current.get(selectedImageId);
      return st ?? null;
    },
  };
}
