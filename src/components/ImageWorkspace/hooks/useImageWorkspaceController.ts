import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { useImageLibrary } from './useImageLibrary';
import { useImageMasking, useMaskOverlay, useViewportTransform } from './index';
import type { WorkspaceTool } from '../types';

export function useImageWorkspaceController() {
  const library = useImageLibrary();
  const [activeTool, setActiveTool] = useState<WorkspaceTool>('hand');
  const [isViewportPanning, setIsViewportPanning] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<any | null>(null);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pointerModeRef = useRef<Map<number, 'pan' | 'mask' | 'selection' | 'none'>>(new Map());
  const modifierHeldRef = useRef(false);
  const [modifierActive, setModifierActive] = useState(false);
  const [maskVisible, setMaskVisible] = useState(true);
  const [selectionVisible, setSelectionVisible] = useState(true);
  const [tempToolOverride, setTempToolOverride] = useState<WorkspaceTool | null>(null);

  type UndoAction = { undo: () => void; redo?: () => void; description?: string };
  const undoStackRef = useRef<UndoAction[]>([]);
  const redoStackRef = useRef<UndoAction[]>([]);
  const [canUndoState, setCanUndoState] = useState(false);

    const pushUndo = useCallback((action: UndoAction) => {
    undoStackRef.current.push(action);
    // clear redo when a new action is pushed
    redoStackRef.current.length = 0;
    setCanUndoState(true);
  }, []);

  const canUndo = useCallback(() => undoStackRef.current.length > 0, []);
  const canRedo = useCallback(() => redoStackRef.current.length > 0, []);

  const undo = useCallback(() => {
    const action = undoStackRef.current.pop();
    if (!action) return;
    try {
      action.undo();
      if (action.redo) redoStackRef.current.push(action);
      setCanUndoState(undoStackRef.current.length > 0);
    } catch (err) {
      // ignore
    }
  }, []);

  const redo = useCallback(() => {
    const action = redoStackRef.current.pop();
    if (!action) return;
    try {
      if (action.redo) action.redo();
      undoStackRef.current.push(action);
      setCanUndoState(true);
    } catch (err) {
      // ignore
    }
  }, []);

  const {
    isMaskTool,
    handlePointerDown: handleMaskPointerDown,
    handlePointerMove: handleMaskPointerMove,
    handlePointerUp: handleMaskPointerUp,
    handleToolChange: handleMaskToolChange,
    lassoPreview,
    overlayVersion,
    getTintOverlay,
    getMaskCanvas,
  } = useImageMasking({
    images: library.images,
    selectedImageId: library.selectedImage?.id ?? null,
    previewRef,
    imageRef,
    onToggleViewportPanning: setIsViewportPanning,
    onPushUndo: pushUndo,
  });
  const {
    tintOverlayRef,
    updateFromViewport,
    forceRedraw,
    markDirty,
    setSelectionDimensions,
    handleSelectionPointerDown,
    handleSelectionPointerMove,
    handleSelectionPointerUp,
    getSelectionState,
    handleSelectionWheel,
  } = useMaskOverlay({
    previewRef,
    imageRef,
    getTintOverlay,
    maskVisible,
    selectionVisible,
    selectedImageId: library.selectedImage?.id ?? null,
    onSelectionChange: setCurrentSelection,
    onPushUndo: pushUndo,
  } as any);
  


  const {
    viewportState,
    isViewportDefault,
    handlePointerDown: handlePanPointerDown,
    handlePointerMove: handlePanPointerMove,
    handlePointerUp: handlePanPointerUp,
    handleWheel,
    resetViewport,
    cancelPan,
  } = useViewportTransform({
    imageRef,
    previewRef,
    onPanningChange: setIsViewportPanning,
    onViewportUpdate: updateFromViewport,
  });

  const selectedImageId = library.selectedImage?.id ?? null;

  useEffect(() => {
    try {
      // read initial selection for the newly selected image
      const st = (typeof getSelectionState === 'function' ? getSelectionState() : null) ?? null;
      setCurrentSelection(st);
    } catch (err) {
      setCurrentSelection(null);
    }
  }, [selectedImageId]);

  // Clear undo/redo history when the selected image changes (or is removed)
  useEffect(() => {
    undoStackRef.current.length = 0;
    redoStackRef.current.length = 0;
    // Ensure UI reflects cleared history
    setCanUndoState(false);
  }, [selectedImageId]);

  const handleViewportPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // Support left (0) and right (2) buttons for masking/panning behaviors
      if (event.button !== 0 && event.button !== 2) return;

      const id = event.pointerId;

      // If modifier held (Shift), prefer viewport panning — route to pan and mark pointer
      if (event.shiftKey) {
        pointerModeRef.current.set(id, 'pan');
        handlePanPointerDown(event);
        // ensure preview shows forced grab while panning with modifier
        const node = previewRef.current;
        if (node) node.classList.add('image-workspace__preview--force-grab');
        return;
      }

      // Otherwise let the active tool try first (e.g. mask). If it claims the event,
      // mark pointer as mask; otherwise prefer selection (grid) handlers for grid tools,
      // and fall back to pan for certain tools.
      if (handleMaskPointerDown(event, activeTool)) {
        pointerModeRef.current.set(id, 'mask');
        // If right-click was used and a mask tool is active, temporarily show the alternate tool
        if (event.button === 2 && (activeTool === 'erase' || activeTool === 'restore')) {
          const alt: WorkspaceTool = activeTool === 'erase' ? 'restore' : 'erase';
          setTempToolOverride(alt);
        }
        return;
      }

      // If active tool is 'hand' -> always pan the viewport (hand tool behavior)
      if (activeTool === 'hand') {
        pointerModeRef.current.set(id, 'pan');
        handlePanPointerDown(event);
        const node = previewRef.current;
        if (node) node.classList.add('image-workspace__preview--force-grab');
        return;
      }

      // For translate: prefer selection handlers; fall back to viewport pan
      if (activeTool === 'translate') {
        if (handleSelectionPointerDown(event, activeTool)) {
          pointerModeRef.current.set(id, 'selection');
          return;
        }
        pointerModeRef.current.set(id, 'pan');
        handlePanPointerDown(event);
        const node = previewRef.current;
        if (node) node.classList.add('image-workspace__preview--force-grab');
        return;
      }

      // For none, route to viewport pan
      if (activeTool === 'none') {
        pointerModeRef.current.set(id, 'pan');
        handlePanPointerDown(event);
        const node = previewRef.current;
        if (node) node.classList.add('image-workspace__preview--force-grab');
        return;
      }
      // Default fallback: pan
      pointerModeRef.current.set(id, 'pan');
      handlePanPointerDown(event);
      const node = previewRef.current;
      if (node) node.classList.add('image-workspace__preview--force-grab');
    },
    [activeTool, handleMaskPointerDown, handlePanPointerDown]
  );

  const handleViewportPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const id = event.pointerId;
      const mode = pointerModeRef.current.get(id) ?? 'none';

      if (mode === 'mask') {
        if (handleMaskPointerMove(event)) return;
        // fall through
      }
      if (mode === 'selection') {
        if (handleSelectionPointerMove(event)) return;
        // fall through to pan
      }
      // pan mode or fallback -> pan the viewport
      handlePanPointerMove(event);
      return;
    },
    [handleMaskPointerMove, handlePanPointerMove]
  );

  const handleViewportPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const id = event.pointerId;
      const mode = pointerModeRef.current.get(id) ?? 'none';

      // Prefer mask handlers; selection handlers; otherwise always perform viewport pan up
      if (mode === 'mask') {
        if (handleMaskPointerUp(event)) {
          pointerModeRef.current.delete(id);
          const node = previewRef.current;
          const anyPan = Array.from(pointerModeRef.current.values()).includes('pan');
          if (node && !anyPan) node.classList.remove('image-workspace__preview--force-grab');
          setTempToolOverride(null);
          return;
        }
      }
      if (mode === 'selection') {
        if (handleSelectionPointerUp(event)) {
          pointerModeRef.current.delete(id);
          return;
        }
      }
      handlePanPointerUp(event);
      pointerModeRef.current.delete(id);
      const node = previewRef.current;
      const anyPan = Array.from(pointerModeRef.current.values()).includes('pan');
      if (node && !anyPan) node.classList.remove('image-workspace__preview--force-grab');
    },
    [handleMaskPointerUp, handlePanPointerUp, handleSelectionPointerDown, handleSelectionPointerMove, handleSelectionPointerUp]
  );

  useEffect(() => {
    if (selectedImageId) {
      resetViewport();
      forceRedraw();
    } else {
      markDirty();
    }
  }, [forceRedraw, markDirty, resetViewport, selectedImageId]);

  useEffect(() => {
    cancelPan();
    handleMaskToolChange();
    setIsViewportPanning(false);
    // Clear any in-flight pointer modes when tool changes
    pointerModeRef.current.clear();
  }, [activeTool, cancelPan, handleMaskToolChange]);

  // Toggle a preview modifier class when Shift is held so cursor can change
  useEffect(() => {
    const setModifier = (on: boolean) => {
      modifierHeldRef.current = on;
      setModifierActive(on);
      const node = previewRef.current;
      if (!node) return;
      if (on) node.classList.add('image-workspace__preview--modifier');
      else node.classList.remove('image-workspace__preview--modifier');
      // update inline cursor: if modifier turned on and no active pan pointers -> show grab
      if (on) {
        const anyPan = Array.from(pointerModeRef.current.values()).includes('pan');
        node.style.cursor = anyPan ? 'grabbing' : 'grab';
      } else {
        node.style.cursor = '';
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd+Z -> undo (no redo)
      try {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
          e.preventDefault();
          undo();
          return;
        }
      } catch (err) {
        // ignore
      }
      if (e.shiftKey) setModifier(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey) setModifier(false);
    };
    const onBlur = () => setModifier(false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      setModifier(false);
    };
  }, [previewRef, undo]);

  // When toggling mask visibility, ensure overlay and image remain aligned to current viewport
  // but do NOT reset the viewport state. Some browsers may cause a repaint that looks like a reset;
  // reapply the current viewport transform to the overlay to preserve position/scale.
  useEffect(() => {
    try {
      forceRedraw();
    } catch (err) {
      /* ignore */
    }
    try {
      updateFromViewport(viewportState);
    } catch (err) {
      /* ignore */
    }
  }, [maskVisible, forceRedraw, updateFromViewport, viewportState]);

  useEffect(() => {
    try {
      forceRedraw();
    } catch (err) {
      /* ignore */
    }
    try {
      updateFromViewport(viewportState);
    } catch (err) {
      /* ignore */
    }
  }, [selectionVisible, forceRedraw, updateFromViewport, viewportState]);

  // Add a class when no tool is selected so we can show default cursor
  useEffect(() => {
    const node = previewRef.current;
    if (!node) return;
    if (activeTool === 'none') node.classList.add('image-workspace__preview--none');
    else node.classList.remove('image-workspace__preview--none');
    return () => node.classList.remove('image-workspace__preview--none');
  }, [previewRef, activeTool]);

  useEffect(() => {
    if (!selectedImageId) return;
    const img = imageRef.current;
    const overlayCanvas = tintOverlayRef.current;
    const applyMask = () => {
      if (!img) return;
      const mask = getMaskCanvas?.();
      if (!mask) {
        // no mask data: ensure overlay hidden
        if (overlayCanvas) overlayCanvas.style.opacity = '0';
        return;
      }

      if (maskVisible) {
        // ensure DOM image is visible and overlay is freshly redrawn
        if (img) img.style.opacity = '';
        if (overlayCanvas) overlayCanvas.style.opacity = '1';
        forceRedraw();
        // ensure overlay aligns with current viewport transform
        try {
          updateFromViewport(viewportState);
        } catch (err) {
          /* ignore */
        }
        return;
      }

      // maskVisible === false -> hide DOM image and let overlay draw the masked image
      if (img) img.style.opacity = '0';
      try {
        // we rely on the overlay to draw the masked image; ensure overlay is visible
        if (overlayCanvas) overlayCanvas.style.opacity = '1';
      } catch (err) {
        // ignore
      }
    };

    // Always redraw first, then apply mask state
    forceRedraw();
    applyMask();
  }, [forceRedraw, overlayVersion, selectedImageId, maskVisible, getMaskCanvas]);

  useEffect(() => {
    if (!selectedImageId) return;
    updateFromViewport(viewportState);
  }, [selectedImageId, updateFromViewport, viewportState]);

  useEffect(() => {
    const handleResize = () => {
      markDirty();
      forceRedraw();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [forceRedraw, markDirty]);

  useEffect(
    () => () => {
      cancelPan();
    },
    [cancelPan]
  );

  const isMaskToolActive = useMemo(() => isMaskTool(activeTool), [activeTool, isMaskTool]);

  const imageTransform = useMemo(
    () =>
      `translate3d(${viewportState.offset.x}px, ${viewportState.offset.y}px, 0) scale(${viewportState.scale})`,
    [viewportState]
  );

  // wrap wheel: if active tool is translate, route to selection wheel else viewport
  const handleWheelWrapper = useCallback(
    (e: any) => {
      // If translate is active but Shift is held, prefer viewport zoom (hand behavior)
      if (activeTool === 'translate' && e && e.shiftKey) {
        handleWheel(e);
        return;
      }

      if (activeTool === 'translate' && typeof handleSelectionWheel === 'function') {
        const native = e && e.nativeEvent ? e.nativeEvent : e;
        if (handleSelectionWheel(native)) return;
      }
      handleWheel(e);
    },
    [activeTool, handleSelectionWheel, handleWheel]
  );

  return {
    library,
    activeTool,
    setActiveTool,
    handleViewportPointerDown,
    handleViewportPointerMove,
    handleViewportPointerUp,
  handleWheel: handleWheelWrapper,
    previewRef,
    imageRef,
    tintOverlayRef,
    lassoPreview,
    isMaskToolActive,
    viewportState,
    isViewportDefault,
    resetViewport,
    isViewportPanning,
    imageTransform,
    selectionVisible,
    setSelectionVisible,
  modifierActive,
  tempToolOverride,
    maskVisible,
    setMaskVisible,
    undo,
    redo,
    setSelectionDimensions,
  forceRedraw,
    canUndo: () => canUndoState,
    canRedo,
    clearHistory: () => {
      undoStackRef.current.length = 0;
      redoStackRef.current.length = 0;
      setCanUndoState(false);
    },
    getSelectionState,
    selectionState: currentSelection,
  };
}
