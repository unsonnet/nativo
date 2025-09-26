import { useCallback, useRef, useEffect } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';

import type { ViewportState } from './useViewportTransform';
import { OverlayComposer } from '../utils/overlayComposer';
import { drawMask } from '../utils/drawMask';
import { drawSelection } from '../utils/drawSelection';
import { quatIdentity, quatFromEuler, quatMul, quatNormalize, type Quat } from '../utils/math3d';
import { computeSelectionBaseRect } from '../utils/selection3d';

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
  onSelectionChange?: (state: unknown | null) => void;
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
  getSelectionState: () => unknown | null;
  getSelectionForImage: (id: string) => unknown | null;
  getOverlayMetrics: () => OverlayMetricsEx | null;
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
  type SelectionState = { sel: SelectionVals; offset: { x: number; y: number }; scale: number; rotation?: Quat | null };
  const selectionMapRef = useRef<Map<string, SelectionState>>(new Map());
  type TranslateTracker = {
    pointerId: number;
    startX: number;
    startY: number;
    startOffset: { x: number; y: number };
    startScale: number;
    mode: 'scale' | 'pan';
    startState: SelectionState | null;
  };
  type RotateTracker = {
    pointerId: number;
    startX: number;
    startY: number;
    startRot: Quat;
    center: { x: number; y: number };
    radius: number;
    startVec: { x: number; y: number; z: number };
    startAngle: number;
    mode: 'arcball' | 'roll';
    startState: SelectionState | null;
  };
  type PointerTrackerEntry = TranslateTracker | RotateTracker;
  const pointerTracker = useRef<Map<number, PointerTrackerEntry>>(new Map());
  type DrawerOpts = {
    tint?: HTMLCanvasElement | null;
    img?: HTMLImageElement | null;
    maskVisible?: boolean;
    selectionVisible?: boolean;
    scale?: number;
    selection?: SelectionState | null;
  } | undefined;
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

  // --- Arcball helpers ---
  const mapPointToArcball = useCallback((px: number, py: number, cx: number, cy: number, radius: number) => {
    const x = (px - cx) / radius;
    const y = (py - cy) / radius;
    const r2 = x * x + y * y;
    if (r2 > 1) {
      const invLen = 1 / Math.sqrt(r2);
      return { x: x * invLen, y: y * invLen, z: 0 };
    }
    return { x, y, z: Math.sqrt(1 - r2) };
  }, []);

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
  } catch {}
    return null;
  }, [STORAGE_PREFIX]);

  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) window.clearTimeout(wheelTimeoutRef.current);
    };
  }, []);
  const savePersisted = useCallback((id: string, st: SelectionState | null) => {
    try {
      if (!st) {
        localStorage.removeItem(STORAGE_PREFIX + id);
        return;
      }
      localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(st));
  } catch {}
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
        } catch {}
      }
    } catch {}
  }, [selectedImageId, loadPersisted, onSelectionChange]);

  useEffect(() => {
    const c = new OverlayComposer();
    c.addDrawer((ctx, metrics, opts) => {
      const o = opts as DrawerOpts;
      try {
        drawMask(ctx, metrics, o?.tint ?? null, o?.img ?? null, !!o?.maskVisible);
      } catch {
        // ignore
      }
    });
    // only draw selection when explicitly visible and selection values exist
    // The selection rectangle must only be drawn when both length and width are defined.
    c.addDrawer((ctx, metrics, opts) => {
      const o = opts as DrawerOpts;
      if (!o || o.selectionVisible === false) return;
      const selState = o.selection;
      if (!selState) return;
      const vals = selState.sel;
      if (!vals) return;
      // require both length and width to be non-null to draw a rectangle
      if (vals.length == null || vals.width == null) return;
      try {
        drawSelection(ctx, metrics, selState);
      } catch {
        // ignore
      }
    });
    composerRef.current = c;
    return () => {
      composerRef.current = null;
    };
  }, []);


  const updateOverlayMetrics = useCallback(
    (_state: ViewportState) => {
      void _state;
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
      } catch {
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
          composer.compose(ctx, metrics, {
            tint,
            img,
            maskVisible,
            selectionVisible: selectionVisibleRef.current,
            scale,
            selection: selState,
          });
        }
      } catch {
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

  // Memoize setters and handlers so their identity is stable between renders.
  const setSelectionDimensionsCb = useCallback(
    (vals: { length: number | null; width: number | null; thickness: number | null } | null) => {
      if (!selectedImageId) {
        selectionRef.current = vals;
      } else {
        if (!vals) {
          selectionMapRef.current.delete(selectedImageId);
          savePersisted(selectedImageId, null);
        } else {
          const prev = selectionMapRef.current.get(selectedImageId) ?? loadPersisted(selectedImageId) ?? { sel: null, offset: { x: 0, y: 0 }, scale: 1, rotation: quatIdentity() };
          const next: SelectionState = { sel: vals, offset: prev.offset ?? { x: 0, y: 0 }, scale: prev.scale ?? 1, rotation: prev.rotation ?? quatIdentity() };
          selectionMapRef.current.set(selectedImageId, next);
          savePersisted(selectedImageId, next);
        }
        try {
          onSelectionChange?.(selectionMapRef.current.get(selectedImageId) ?? null);
        } catch {}
      }
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
        } catch {
          // ignore
        }
        rafRef.current = null;
      });
    },
    [selectedImageId, savePersisted, onSelectionChange, updateOverlayMetrics, redrawOverlay, loadPersisted]
  );

  const handleSelectionPointerDownCb = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, tool: string) => {
      const id = e.pointerId;
      if (e.button !== 0 && e.button !== 2) return false;
      const key = selectedImageId ?? '';
      const state = (selectedImageId ? selectionMapRef.current.get(key) : null) ?? (selectionRef.current ? { sel: selectionRef.current, offset: { x: 0, y: 0 }, scale: 1 } : null);
      if (!state) return false;
      try {
        previewRef.current?.setPointerCapture(id);
      } catch {}
      if (tool === 'translate') {
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
      }
      if (tool === 'rotate') {
        const st = selectedImageId ? selectionMapRef.current.get(key) : null;
        const baseRect = computeSelectionBaseRect(overlayMetricsRef.current, (st ?? state));
        const overlayEl = tintOverlayRef.current;
        const rect = overlayEl?.getBoundingClientRect();
        const metrics = overlayMetricsRef.current;
        const containerW = metrics?.containerWidth ?? rect?.width ?? 1;
        const containerH = metrics?.containerHeight ?? rect?.height ?? 1;
        const scaleX = rect && containerW ? rect.width / containerW : 1;
        const scaleY = rect && containerH ? rect.height / containerH : 1;
        const s = (Number.isFinite(scaleX) && Number.isFinite(scaleY)) ? (scaleX + scaleY) * 0.5 : 1;
        const cxLocal = baseRect ? baseRect.cx : (containerW * 0.5);
        const cyLocal = baseRect ? baseRect.cy : (containerH * 0.5);
        const cxScreen = (rect?.left ?? 0) + cxLocal * s;
        const cyScreen = (rect?.top ?? 0) + cyLocal * s;
        const radiusLocal = baseRect ? Math.min(baseRect.w, baseRect.h) * 0.5 : Math.min(containerW, containerH) * 0.25;
        const radiusScreen = Math.max(10, radiusLocal * s);
        const startVec = mapPointToArcball(e.clientX, e.clientY, cxScreen, cyScreen, radiusScreen);
        const startAngle = Math.atan2(e.clientY - cyScreen, e.clientX - cxScreen);
        const mode: 'arcball' | 'roll' = e.altKey ? 'roll' : 'arcball';
        const startRot = (st?.rotation ?? quatIdentity()) as Quat;
        pointerTracker.current.set(id, {
          pointerId: id,
          startX: e.clientX,
          startY: e.clientY,
          startRot,
          center: { x: cxScreen, y: cyScreen },
          radius: radiusScreen,
          startVec,
          startAngle,
          mode,
          startState: JSON.parse(JSON.stringify(st ?? state)),
        });
        return true;
      }
      return false;
    },
    [selectedImageId, mapPointToArcball, previewRef]
  );

  const handleSelectionPointerMoveCb = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const id = e.pointerId;
      const t = pointerTracker.current.get(id);
      if (!t) return false;
      e.preventDefault();
      const dx = e.clientX - t.startX;
      const dy = e.clientY - t.startY;
      const key = selectedImageId ?? '';
      const st = (selectedImageId ? selectionMapRef.current.get(key) : null) ?? (selectionRef.current ? { sel: selectionRef.current, offset: { x: 0, y: 0 }, scale: 1, rotation: quatIdentity() } : null);
      if (!st) return false;
      if (t.mode === 'scale') {
        const delta = 1 + dy * -0.002;
        st.scale = Math.max(0.1, t.startScale * delta);
      } else if (t.mode === 'pan') {
        const vs = lastViewportRef.current?.scale ?? 1;
        st.offset = { x: t.startOffset.x + dx / vs, y: t.startOffset.y + dy / vs };
      } else if (t.mode === 'arcball' || t.mode === 'roll') {
        if (!st.rotation) st.rotation = quatIdentity();
        const cx = t.center.x;
        const cy = t.center.y;
        const radius = t.radius || 80;
        if (t.mode === 'roll') {
          const curAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
          let delta = curAngle - t.startAngle;
          if (delta > Math.PI) delta -= 2 * Math.PI;
          if (delta < -Math.PI) delta += 2 * Math.PI;
          const dq = quatFromEuler(0, 0, delta);
          st.rotation = quatNormalize(quatMul(dq, t.startRot));
        } else if (t.mode === 'arcball') {
          const v0 = t.startVec;
          const v1 = mapPointToArcball(e.clientX, e.clientY, cx, cy, radius);
          let dot = v0.x * v1.x + v0.y * v1.y + v0.z * v1.z;
          dot = Math.max(-1, Math.min(1, dot));
          const angle = Math.acos(dot);
          let ax = v0.y * v1.z - v0.z * v1.y;
          let ay = v0.z * v1.x - v0.x * v1.z;
          let az = v0.x * v1.y - v0.y * v1.x;
          const len = Math.hypot(ax, ay, az);
          if (len >= 1e-6 && Number.isFinite(angle)) {
            ax /= len; ay /= len; az /= len;
            const half = angle * 0.5;
            const s = Math.sin(half);
            const dq = { x: ax * s, y: ay * s, z: az * s, w: Math.cos(half) } as Quat;
            st.rotation = quatNormalize(quatMul(dq, t.startRot));
          }
        }
      }
      if (selectedImageId) selectionMapRef.current.set(selectedImageId, st);
      else selectionRef.current = st.sel;
      try {
        onSelectionChange?.((selectedImageId ? selectionMapRef.current.get(selectedImageId) : null) ?? (selectionRef.current ? { sel: selectionRef.current, offset: { x: 0, y: 0 }, scale: 1 } : null));
      } catch {}
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        try {
          const state = lastViewportRef.current;
          const { metrics } = updateOverlayMetrics(state);
          if (metrics) {
            redrawOverlay(metrics, state.scale, true);
          }
        } catch {}
        rafRef.current = null;
      });
      return true;
    },
    [selectedImageId, updateOverlayMetrics, redrawOverlay, mapPointToArcball, onSelectionChange]
  );

  const handleSelectionPointerUpCb = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const id = e.pointerId;
      const t = pointerTracker.current.get(id);
      if (!t) return false;
      try {
        previewRef.current?.releasePointerCapture(id);
      } catch {}
      pointerTracker.current.delete(id);
      if (selectedImageId) {
        const st = selectionMapRef.current.get(selectedImageId) ?? null;
        try {
          savePersisted(selectedImageId, st);
        } catch {}
        try {
          if (onPushUndo && t.startState) {
            const before = t.startState as SelectionState;
            const after = st as SelectionState | null;
            const changed = !!after && (
              before.offset.x !== after.offset.x ||
              before.offset.y !== after.offset.y ||
              before.scale !== after.scale ||
              JSON.stringify(before.rotation ?? quatIdentity()) !== JSON.stringify(after.rotation ?? quatIdentity())
            );
            if (changed) {
              const doRedo = () => {
                selectionMapRef.current.set(selectedImageId!, after!);
                savePersisted(selectedImageId!, after);
                try {
                  onSelectionChange?.(after);
                } catch {}
                try {
                  const state = lastViewportRef.current;
                  const { metrics } = updateOverlayMetrics(state);
                  if (metrics) redrawOverlay(metrics, state.scale, true);
                } catch {}
              };
              const doUndo = () => {
                selectionMapRef.current.set(selectedImageId!, before);
                savePersisted(selectedImageId!, before);
                try {
                  onSelectionChange?.(before);
                } catch {}
                try {
                  const state = lastViewportRef.current;
                  const { metrics } = updateOverlayMetrics(state);
                  if (metrics) redrawOverlay(metrics, state.scale, true);
                } catch {}
              };
              const desc = (t.mode === 'arcball' || t.mode === 'roll') ? 'Rotate selection' : (t.mode === 'scale' ? 'Scale selection' : 'Move selection');
              onPushUndo({ undo: doUndo, redo: doRedo, description: desc });
            }
          }
        } catch {}
      }
      return true;
    },
    [selectedImageId, savePersisted, onPushUndo, onSelectionChange, updateOverlayMetrics, redrawOverlay, previewRef]
  );

  const handleSelectionWheelCb = useCallback(
    (e: WheelEvent) => {
      const key = selectedImageId ?? '';
      const st = (selectedImageId ? selectionMapRef.current.get(key) : null) ?? (selectionRef.current ? { sel: selectionRef.current, offset: { x: 0, y: 0 }, scale: 1 } : null);
      if (!st) return false;
      e.preventDefault();
      const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      try {
        if (selectedImageId && !wheelStartRef.current) {
          const existing = selectionMapRef.current.get(selectedImageId) ?? null;
          wheelStartRef.current = existing ? JSON.parse(JSON.stringify(existing)) : null;
        }
      } catch {}
      const factor = Math.exp(-delta * 0.0015);
      st.scale = Math.max(0.1, Math.min(10, st.scale * factor));
      if (selectedImageId) selectionMapRef.current.set(selectedImageId, st);
      else selectionRef.current = st.sel;
      try {
        onSelectionChange?.((selectedImageId ? selectionMapRef.current.get(selectedImageId) : null) ?? (selectionRef.current ? { sel: selectionRef.current, offset: { x: 0, y: 0 }, scale: 1 } : null));
      } catch {}
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        try {
          const state = lastViewportRef.current;
          const { metrics } = updateOverlayMetrics(state);
          if (metrics) redrawOverlay(metrics, state.scale, true);
        } catch {}
        rafRef.current = null;
      });
      try {
        if (selectedImageId) {
          if (wheelTimeoutRef.current) window.clearTimeout(wheelTimeoutRef.current);
          wheelTimeoutRef.current = window.setTimeout(() => {
            const final = selectionMapRef.current.get(selectedImageId) ?? null;
            savePersisted(selectedImageId!, final);
            try {
              if (onPushUndo && wheelStartRef.current) {
                const before = wheelStartRef.current as SelectionState;
                const after = final as SelectionState | null;
                const changed = !!after && (before.scale !== after.scale || before.offset.x !== after.offset.x || before.offset.y !== after.offset.y);
                if (changed) {
                  const doRedo = () => {
                    selectionMapRef.current.set(selectedImageId!, after!);
                    savePersisted(selectedImageId!, after);
                    try { onSelectionChange?.(after); } catch {}
                    try { const s = lastViewportRef.current; const { metrics } = updateOverlayMetrics(s); if (metrics) redrawOverlay(metrics, s.scale, true); } catch {}
                  };
                  const doUndo = () => {
                    selectionMapRef.current.set(selectedImageId!, before);
                    savePersisted(selectedImageId!, before);
                    try { onSelectionChange?.(before); } catch {}
                    try { const s = lastViewportRef.current; const { metrics } = updateOverlayMetrics(s); if (metrics) redrawOverlay(metrics, s.scale, true); } catch {}
                  };
                  onPushUndo({ undo: doUndo, redo: doRedo, description: 'Scale selection' });
                }
              }
            } catch {}
            wheelStartRef.current = null;
            wheelTimeoutRef.current = null;
          }, 150);
        }
      } catch {}
      return true;
    },
    [selectedImageId, savePersisted, onPushUndo, onSelectionChange, updateOverlayMetrics, redrawOverlay]
  );

  const getSelectionStateCb = useCallback(() => {
    if (!selectedImageId) {
      if (selectionRef.current) return { sel: selectionRef.current, offset: { x: 0, y: 0 }, scale: 1 } as SelectionState;
      return null;
    }
    const st = selectionMapRef.current.get(selectedImageId);
    return st ?? null;
  }, [selectedImageId]);

  const getSelectionForImage = useCallback((id: string) => {
    if (!id) return null;
    const persisted = selectionMapRef.current.get(id) ?? loadPersisted(id) ?? null;
    return persisted ?? null;
  }, [loadPersisted]);

  const getOverlayMetrics = useCallback(() => overlayMetricsRef.current, []);

  return {
    tintOverlayRef,
    updateFromViewport,
    forceRedraw,
    markDirty,
    setSelectionDimensions: setSelectionDimensionsCb,
    handleSelectionPointerDown: handleSelectionPointerDownCb,
    handleSelectionPointerMove: handleSelectionPointerMoveCb,
    handleSelectionPointerUp: handleSelectionPointerUpCb,
    handleSelectionWheel: handleSelectionWheelCb,
    getSelectionState: getSelectionStateCb,
    getSelectionForImage,
    getOverlayMetrics,
  };
}
