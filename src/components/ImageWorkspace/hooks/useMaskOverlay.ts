import { useCallback, useRef, useEffect } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';

import type { ViewportState } from './useViewportTransform';
import { OverlayComposer } from '../utils/overlayComposer';
import { drawMask } from '../utils/drawMask';
import { drawSelection } from '../utils/drawSelection';
import { quatIdentity, quatMul, quatNormalize, type Quat } from '../utils/math3d';

const MAX_OVERLAY_DIMENSION = 4096;

type OverlayMetrics = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type OverlayMetricsEx = OverlayMetrics & { containerWidth: number; containerHeight: number };

// Simple selection state - just the essential data
type SelectionDimensions = { 
  length: number | null; 
  width: number | null; 
  thickness: number | null;
} | null;

type SelectionTransform = {
  offset: { x: number; y: number };
  scale: number;
  rotation: Quat;
};

type SelectionState = {
  dimensions: SelectionDimensions;
  transform: SelectionTransform;
};

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
  setSelectionDimensions: (vals: SelectionDimensions) => void;
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
}: UseMaskOverlayParams): UseMaskOverlayResult {
  const tintOverlayRef = useRef<HTMLCanvasElement | null>(null);
  
  // Per-image selection storage - clean and simple
  const selectionStates = useRef<Map<string, SelectionState>>(new Map());
  
  // Current drag/interaction state
  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number; transform: SelectionTransform; initialState: SelectionState } | null>(null);
  const isScaling = useRef(false);
  const scaleStart = useRef<{ scale: number; initialState: SelectionState } | null>(null);
  const isRotating = useRef(false);
  const rotateStart = useRef<{ rotation: Quat; center: { x: number; y: number }; radius: number; startPoint3D: { x: number; y: number; z: number }; initialState: SelectionState } | null>(null);
  
  // Overlay state
  const overlayMetricsRef = useRef<OverlayMetricsEx | null>(null);
  const overlayReadyRef = useRef(false);
  const lastViewportRef = useRef<ViewportState>({ scale: 1, offset: { x: 0, y: 0 } });
  const rafRef = useRef<number | null>(null);
  const composerRef = useRef<OverlayComposer | null>(null);
  
  // 3D Arcball rotation helper - maps 2D screen point to 3D sphere
  const mapToArcball = useCallback((screenX: number, screenY: number, centerX: number, centerY: number, radius: number) => {
    // Convert screen coordinates to normalized coordinates [-1, 1]
    const x = (screenX - centerX) / radius;
    const y = (screenY - centerY) / radius;
    const len2 = x * x + y * y;
    
    if (len2 > 1.0) {
      // Point is outside the sphere, project to sphere edge
      const invLen = 1.0 / Math.sqrt(len2);
      return { x: x * invLen, y: y * invLen, z: 0 };
    } else {
      // Point is inside the sphere, calculate Z coordinate
      return { x, y, z: Math.sqrt(1.0 - len2) };
    }
  }, []);
  
  // Storage helpers
  const STORAGE_PREFIX = 'k9.selection.';
  
  const saveToStorage = useCallback((imageId: string, state: SelectionState | null) => {
    try {
      if (!state || !state.dimensions) {
        localStorage.removeItem(STORAGE_PREFIX + imageId);
      } else {
        localStorage.setItem(STORAGE_PREFIX + imageId, JSON.stringify(state));
      }
    } catch {}
  }, []);
  
  const loadFromStorage = useCallback((imageId: string): SelectionState | null => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + imageId);
      if (!raw) return null;
      return JSON.parse(raw) as SelectionState;
    } catch {
      return null;
    }
  }, []);
  
  // Get current selection state for active image
  const getCurrentSelection = useCallback((): SelectionState | null => {
    if (!selectedImageId) return null;
    
    let state = selectionStates.current.get(selectedImageId) || null;
    if (!state) {
      // Try to load from storage
      const loaded = loadFromStorage(selectedImageId);
      if (loaded) {
        state = loaded;
        selectionStates.current.set(selectedImageId, state);
      }
    }
    return state;
  }, [selectedImageId, loadFromStorage]);

  const updateOverlayMetrics = useCallback(() => {
    const overlay = tintOverlayRef.current;
    const preview = previewRef.current;
    const img = imageRef.current;
    
    if (!overlay || !preview || !img) {
      return { metrics: null, sizeChanged: false };
    }
    
    const tint = getTintOverlay();
    const naturalWidth = tint?.width ?? img.naturalWidth;
    const naturalHeight = tint?.height ?? img.naturalHeight;
    
    if (!naturalWidth || !naturalHeight) {
      overlay.style.opacity = '0';
      overlayMetricsRef.current = null;
      return { metrics: null, sizeChanged: false };
    }
    
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
    
    const width = naturalWidth * fitScale;
    const height = naturalHeight * fitScale;
    const left = (parentRect.width - width) / 2;
    const top = (parentRect.height - height) / 2;
    
    const metrics: OverlayMetricsEx = {
      left,
      top,
      width,
      height,
      containerWidth: parentRect.width,
      containerHeight: parentRect.height,
    };
    
    // Update overlay element
    overlay.style.left = '0px';
    overlay.style.top = '0px';
    overlay.style.width = `${Math.ceil(metrics.containerWidth)}px`;
    overlay.style.height = `${Math.ceil(metrics.containerHeight)}px`;
    
    try {
      overlay.style.transformOrigin = 'top left';
      overlay.style.transform = img.style.transform || '';
    } catch {}
    
    const previous = overlayMetricsRef.current;
    const sizeChanged = !previous ||
      Math.abs(previous.width - metrics.width) > 0.5 ||
      Math.abs(previous.height - metrics.height) > 0.5 ||
      Math.abs(previous.left - metrics.left) > 0.5 ||
      Math.abs(previous.top - metrics.top) > 0.5;
    
    overlayMetricsRef.current = metrics;
    return { metrics, sizeChanged };
  }, [getTintOverlay, imageRef, previewRef]);

  const redrawOverlay = useCallback((metrics: OverlayMetricsEx, scale: number, force = false) => {
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
    const renderScaleX = pixelW / metrics.containerWidth;
    const renderScaleY = pixelH / metrics.containerHeight;
    ctx.setTransform(renderScaleX, 0, 0, renderScaleY, 0, 0);
    
    try {
      const img = imageRef.current;
      const composer = composerRef.current;
      if (composer) {
        composer.compose(ctx, metrics, {
          tint,
          img,
          maskVisible,
          selectionVisible,
          scale,
        });
      }
    } catch {}
    
    ctx.restore();
    overlay.style.opacity = '1';
    overlayReadyRef.current = true;
  }, [getTintOverlay, maskVisible, selectionVisible, imageRef]);

  const forceRedraw = useCallback(() => {
    const state = lastViewportRef.current;
    const { metrics } = updateOverlayMetrics();
    if (metrics) {
      redrawOverlay(metrics, state.scale, true);
    }
  }, [updateOverlayMetrics, redrawOverlay]);

  // Update selection state and persist immediately
  const updateSelection = useCallback((newState: SelectionState | null) => {
    if (!selectedImageId) return;
    
    if (!newState) {
      selectionStates.current.delete(selectedImageId);
      saveToStorage(selectedImageId, null);
    } else {
      selectionStates.current.set(selectedImageId, newState);
      saveToStorage(selectedImageId, newState);
    }
    
    // Notify parent component with legacy format
    try {
      const legacyFormat = newState ? {
        sel: newState.dimensions,
        offset: newState.transform.offset,
        scale: newState.transform.scale,
        rotation: newState.transform.rotation
      } : null;
      onSelectionChange?.(legacyFormat);
    } catch {}
    
    // Schedule redraw
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      forceRedraw();
      rafRef.current = null;
    });
  }, [selectedImageId, saveToStorage, onSelectionChange, forceRedraw]);
  
  // Calculate selection rectangle based on dimensions and aspect ratio
  const calculateSelectionRect = useCallback((
    dimensions: SelectionDimensions, 
    transform: SelectionTransform, 
    metrics: OverlayMetrics
  ) => {
    if (!dimensions || !dimensions.length || !dimensions.width) return null;
    
    const aspect = dimensions.length / dimensions.width;
    const maxSize = Math.min(metrics.width, metrics.height) * 0.3;
    
    let width = maxSize;
    let height = maxSize / aspect;
    
    if (height > maxSize) {
      height = maxSize;
      width = maxSize * aspect;
    }
    
    // Apply scaling
    width *= transform.scale;
    height *= transform.scale;
    
    // Center position + offset
    const centerX = metrics.left + metrics.width / 2 + transform.offset.x;
    const centerY = metrics.top + metrics.height / 2 + transform.offset.y;
    
    return {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      centerX,
      centerY
    };
  }, []);

  // Initialize overlay composer
  useEffect(() => {
    const composer = new OverlayComposer();
    
    // Add mask drawer
    composer.addDrawer((ctx, metrics, opts: unknown) => {
      const options = opts as { tint?: HTMLCanvasElement | null; img?: HTMLImageElement | null; maskVisible?: boolean };
      try {
        drawMask(ctx, metrics, options?.tint ?? null, options?.img ?? null, !!options?.maskVisible);
      } catch {}
    });
    
    // Add selection drawer
    composer.addDrawer((ctx, metrics, opts: unknown) => {
      const options = opts as { selectionVisible?: boolean };
      if (!options?.selectionVisible) return;
      
      const selection = getCurrentSelection();
      if (!selection || !selection.dimensions) return;
      
      try {
        // Convert new format to old format expected by drawSelection
        const legacySelectionState = {
          sel: selection.dimensions,
          offset: selection.transform.offset,
          scale: selection.transform.scale,
          rotation: selection.transform.rotation
        };
        drawSelection(ctx, metrics, legacySelectionState);
      } catch {}
    });
    
    composerRef.current = composer;
    
    return () => {
      composerRef.current = null;
    };
  }, [getCurrentSelection]);

  const updateFromViewport = useCallback((state: ViewportState) => {
    lastViewportRef.current = state;
    const { metrics, sizeChanged } = updateOverlayMetrics();
    if (metrics) {
      redrawOverlay(metrics, state.scale, sizeChanged);
    }
  }, [redrawOverlay, updateOverlayMetrics]);

  const markDirty = useCallback(() => {
    overlayReadyRef.current = false;
    const overlay = tintOverlayRef.current;
    if (overlay) overlay.style.opacity = '0';
  }, []);

  // Set selection dimensions (called when length/width inputs change)
  const setSelectionDimensions = useCallback((dimensions: SelectionDimensions) => {
    if (!dimensions || (!dimensions.length && !dimensions.width)) {
      updateSelection(null);
      return;
    }
    
    const currentState = getCurrentSelection();
    const transform = currentState?.transform ?? {
      offset: { x: 0, y: 0 },
      scale: 1,
      rotation: quatIdentity()
    };
    
    updateSelection({
      dimensions,
      transform
    });
  }, [getCurrentSelection, updateSelection]);

  // Handle pointer down - start drag/rotation
  const handleSelectionPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>, tool: string) => {
    if (e.button !== 0 && e.button !== 2) return false;
    
    const selection = getCurrentSelection();
    if (!selection || !selection.dimensions) return false;
    
    const metrics = overlayMetricsRef.current;
    if (!metrics) return false;
    
    const rect = calculateSelectionRect(selection.dimensions, selection.transform, metrics);
    if (!rect) return false;
    
    try {
      previewRef.current?.setPointerCapture(e.pointerId);
    } catch {}
    
    if (tool === 'translate') {
      isDragging.current = true;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        transform: { ...selection.transform },
        initialState: { ...selection }
      };
      return true;
    }
    
    if (tool === 'rotate') {
      isRotating.current = true;
      
      // Get overlay element to convert coordinates
      const overlayEl = tintOverlayRef.current;
      const overlayRect = overlayEl?.getBoundingClientRect();
      
      if (!overlayRect) return false;
      
      // Convert overlay coordinates to screen coordinates
      const metrics = overlayMetricsRef.current;
      if (!metrics) return false;
      
      // Calculate scale factor between overlay canvas and actual display
      const scaleX = overlayRect.width / metrics.containerWidth;
      const scaleY = overlayRect.height / metrics.containerHeight;
      
      // Convert rectangle center from overlay space to screen space
      const screenCenterX = overlayRect.left + rect.centerX * scaleX;
      const screenCenterY = overlayRect.top + rect.centerY * scaleY;
      
      // Calculate arcball radius based on rectangle size (in screen space)
      const radius = Math.min(rect.width * scaleX, rect.height * scaleY) * 0.75;
      
      // Map initial pointer position to 3D sphere
      const startPoint3D = mapToArcball(e.clientX, e.clientY, screenCenterX, screenCenterY, radius);
      
      rotateStart.current = {
        rotation: { ...selection.transform.rotation },
        center: { x: screenCenterX, y: screenCenterY },
        radius,
        startPoint3D,
        initialState: { ...selection }
      };
      return true;
    }
    
    return false;
  }, [getCurrentSelection, calculateSelectionRect, previewRef, mapToArcball]);

  // Handle pointer move - perform drag/rotation
  const handleSelectionPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const selection = getCurrentSelection();
    if (!selection) return false;
    
    if (isDragging.current && dragStart.current) {
      e.preventDefault();
      
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const viewportScale = lastViewportRef.current.scale;
      
      const newTransform = {
        ...selection.transform,
        offset: {
          x: dragStart.current.transform.offset.x + dx / viewportScale,
          y: dragStart.current.transform.offset.y + dy / viewportScale
        }
      };
      
      updateSelection({
        ...selection,
        transform: newTransform
      });
      
      return true;
    }
    
    if (isRotating.current && rotateStart.current) {
      e.preventDefault();
      
      const center = rotateStart.current.center;
      const radius = rotateStart.current.radius;
      const startPoint3D = rotateStart.current.startPoint3D;
      
      // Map current pointer position to 3D sphere
      const currentPoint3D = mapToArcball(e.clientX, e.clientY, center.x, center.y, radius);
      
      // Calculate rotation quaternion from 3D vector difference
      const v0 = startPoint3D;
      const v1 = currentPoint3D;
      
      // Calculate cross product (rotation axis)
      const cross = {
        x: v0.y * v1.z - v0.z * v1.y,
        y: v0.z * v1.x - v0.x * v1.z,
        z: v0.x * v1.y - v0.y * v1.x
      };
      
      // Calculate dot product (for rotation angle)
      const dot = v0.x * v1.x + v0.y * v1.y + v0.z * v1.z;
      const crossLength = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
      
      if (crossLength > 1e-6) {
        // Normalize the rotation axis
        const axis = {
          x: cross.x / crossLength,
          y: cross.y / crossLength,
          z: cross.z / crossLength
        };
        
        // Calculate rotation angle
        const angle = Math.atan2(crossLength, dot);
        
        // Create rotation quaternion
        const halfAngle = angle * 0.5;
        const sinHalf = Math.sin(halfAngle);
        const deltaQuat: Quat = {
          x: axis.x * sinHalf,
          y: axis.y * sinHalf,
          z: axis.z * sinHalf,
          w: Math.cos(halfAngle)
        };
        
        // Apply rotation to the original rotation
        const newRotation = quatNormalize(quatMul(deltaQuat, rotateStart.current.rotation));
        
        const newTransform = {
          ...selection.transform,
          rotation: newRotation
        };
        
        updateSelection({
          ...selection,
          transform: newTransform
        });
      }
      
      return true;
    }
    
    return false;
  }, [getCurrentSelection, updateSelection, mapToArcball]);

  // Handle pointer up - end drag/rotation, add undo
  const handleSelectionPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging.current && !isRotating.current && !isScaling.current) return false;
    
    try {
      previewRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
    
    const wasInteracting = isDragging.current || isRotating.current || isScaling.current;
    
    // Add undo action
    if (wasInteracting && onPushUndo && selectedImageId) {
      const currentState = getCurrentSelection();
      
      if (currentState) {
        let before: SelectionState | null = null;
        let description = '';
        
        if (isDragging.current && dragStart.current?.initialState) {
          before = dragStart.current.initialState;
          description = 'Move selection';
        } else if (isRotating.current && rotateStart.current?.initialState) {
          before = rotateStart.current.initialState;
          description = 'Rotate selection';
        } else if (isScaling.current && scaleStart.current?.initialState) {
          before = scaleStart.current.initialState;
          description = 'Scale selection';
        }
        
        if (before) {
          const after = { ...currentState };
          
          onPushUndo({
            description,
            undo: () => updateSelection(before),
            redo: () => updateSelection(after)
          });
        }
      }
    }
    
    // Reset interaction state
    isDragging.current = false;
    isRotating.current = false;
    isScaling.current = false;
    dragStart.current = null;
    rotateStart.current = null;
    scaleStart.current = null;
    
    return wasInteracting;
  }, [getCurrentSelection, updateSelection, onPushUndo, selectedImageId, previewRef]);

  // Handle wheel - scaling
  const handleSelectionWheel = useCallback((e: WheelEvent) => {
    const selection = getCurrentSelection();
    if (!selection) return false;
    
    e.preventDefault();
    
    if (!isScaling.current) {
      isScaling.current = true;
      scaleStart.current = { 
        scale: selection.transform.scale,
        initialState: selection
      };
    }
    
    const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
    const factor = Math.exp(-delta * 0.001);
    const newScale = Math.max(0.1, Math.min(10, selection.transform.scale * factor));
    
    const newTransform = {
      ...selection.transform,
      scale: newScale
    };
    
    updateSelection({
      ...selection,
      transform: newTransform
    });
    
    // Debounced undo creation
    setTimeout(() => {
      if (isScaling.current && scaleStart.current && onPushUndo && selectedImageId) {
        const currentState = getCurrentSelection();
        if (currentState && Math.abs(currentState.transform.scale - scaleStart.current.scale) > 0.01) {
          const before = scaleStart.current.initialState;
          const after = { ...currentState };
          
          onPushUndo({
            description: 'Scale selection',
            undo: () => updateSelection(before),
            redo: () => updateSelection(after)
          });
        }
        
        isScaling.current = false;
        scaleStart.current = null;
      }
    }, 150);
    
    return true;
  }, [getCurrentSelection, updateSelection, onPushUndo, selectedImageId]);

  // Get current selection state (for export) - return legacy format
  const getSelectionState = useCallback(() => {
    const selection = getCurrentSelection();
    if (!selection) return null;
    
    // Convert to legacy format
    return {
      sel: selection.dimensions,
      offset: selection.transform.offset,
      scale: selection.transform.scale,
      rotation: selection.transform.rotation
    };
  }, [getCurrentSelection]);

  // Get selection for specific image (for reports) - return legacy format
  const getSelectionForImage = useCallback((imageId: string) => {
    const stored = selectionStates.current.get(imageId);
    if (stored) {
      return {
        sel: stored.dimensions,
        offset: stored.transform.offset,
        scale: stored.transform.scale,
        rotation: stored.transform.rotation
      };
    }
    
    const loaded = loadFromStorage(imageId);
    if (loaded) {
      return {
        sel: loaded.dimensions,
        offset: loaded.transform.offset,
        scale: loaded.transform.scale,
        rotation: loaded.transform.rotation
      };
    }
    
    return null;
  }, [loadFromStorage]);

  // Get overlay metrics
  const getOverlayMetrics = useCallback(() => {
    return overlayMetricsRef.current;
  }, []);

  return {
    tintOverlayRef,
    updateFromViewport,
    forceRedraw,
    markDirty,
    setSelectionDimensions,
    handleSelectionPointerDown,
    handleSelectionPointerMove,
    handleSelectionPointerUp,
    handleSelectionWheel,
    getSelectionState,
    getSelectionForImage,
    getOverlayMetrics,
  };
}