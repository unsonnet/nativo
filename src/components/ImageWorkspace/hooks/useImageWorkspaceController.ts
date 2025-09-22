import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { useImageLibrary } from './useImageLibrary';
import { useImageMasking, useMaskOverlay, useViewportTransform } from './index';
import type { WorkspaceTool } from '../types';

export function useImageWorkspaceController() {
  const library = useImageLibrary();
  const [activeTool, setActiveTool] = useState<WorkspaceTool>('pan');
  const [isViewportPanning, setIsViewportPanning] = useState(false);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pointerModeRef = useRef<Map<number, 'pan' | 'mask' | 'none'>>(new Map());
  const modifierHeldRef = useRef(false);
  const [modifierActive, setModifierActive] = useState(false);
  const [maskVisible, setMaskVisible] = useState(true);

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
  });

  const { tintOverlayRef, updateFromViewport, forceRedraw, markDirty } = useMaskOverlay({
    previewRef,
    imageRef,
    getTintOverlay,
    maskVisible,
  });

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

  const handleViewportPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;

      const id = event.pointerId;

      // If modifier held, prefer viewport panning — route to pan and mark pointer
      if (event.ctrlKey || event.metaKey) {
        pointerModeRef.current.set(id, 'pan');
        handlePanPointerDown(event);
        // ensure preview shows forced grab while panning with modifier
        const node = previewRef.current;
        if (node) node.classList.add('image-workspace__preview--force-grab');
        return;
      }

      // Otherwise let the active tool try first (e.g. mask). If it claims the event,
      // mark pointer as mask; otherwise fall back to pan for certain tools.
      if (handleMaskPointerDown(event, activeTool)) {
        pointerModeRef.current.set(id, 'mask');
        return;
      }

      if (activeTool === 'none' || activeTool === 'pan' || activeTool === 'scale' || activeTool === 'rotate') {
        pointerModeRef.current.set(id, 'pan');
        handlePanPointerDown(event);
        const node = previewRef.current;
        if (node) node.classList.add('image-workspace__preview--force-grab');
      } else {
        pointerModeRef.current.set(id, 'none');
      }
    },
    [activeTool, handleMaskPointerDown, handlePanPointerDown]
  );

  const handleViewportPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const id = event.pointerId;
      const mode = pointerModeRef.current.get(id) ?? 'none';

      if (mode === 'mask') {
        if (handleMaskPointerMove(event)) return;
      } else if (mode === 'pan') {
        handlePanPointerMove(event);
        return;
      } else {
        // no explicit mode: allow mask first (backwards compatible)
        if (handleMaskPointerMove(event)) return;
        handlePanPointerMove(event);
      }
    },
    [handleMaskPointerMove, handlePanPointerMove]
  );

  const handleViewportPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const id = event.pointerId;
      const mode = pointerModeRef.current.get(id) ?? 'none';

      if (mode === 'mask') {
        if (handleMaskPointerUp(event)) {
          pointerModeRef.current.delete(id);
          // remove force-grab if no pan pointers remain
          const node = previewRef.current;
          const anyPan = Array.from(pointerModeRef.current.values()).includes('pan');
          if (node && !anyPan) node.classList.remove('image-workspace__preview--force-grab');
          return;
        }
      } else if (mode === 'pan') {
        handlePanPointerUp(event);
        pointerModeRef.current.delete(id);
        const node = previewRef.current;
        const anyPan = Array.from(pointerModeRef.current.values()).includes('pan');
        if (node && !anyPan) node.classList.remove('image-workspace__preview--force-grab');
        return;
      } else {
        if (handleMaskPointerUp(event)) {
          pointerModeRef.current.delete(id);
          const node = previewRef.current;
          const anyPan = Array.from(pointerModeRef.current.values()).includes('pan');
          if (node && !anyPan) node.classList.remove('image-workspace__preview--force-grab');
          return;
        }
        handlePanPointerUp(event);
        pointerModeRef.current.delete(id);
        const node = previewRef.current;
        const anyPan = Array.from(pointerModeRef.current.values()).includes('pan');
        if (node && !anyPan) node.classList.remove('image-workspace__preview--force-grab');
      }
    },
    [handleMaskPointerUp, handlePanPointerUp]
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

  // Toggle a preview modifier class when Ctrl or Meta is held so cursor can change
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
      if (e.ctrlKey || e.metaKey) setModifier(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) setModifier(false);
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
  }, [previewRef]);

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

  return {
    library,
    activeTool,
    setActiveTool,
    handleViewportPointerDown,
    handleViewportPointerMove,
    handleViewportPointerUp,
    handleWheel,
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
    modifierActive,
    maskVisible,
    setMaskVisible,
  };
}
