import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { useImageLibrary } from './useImageLibrary';
import { useImageMasking, useMaskOverlay, useViewportTransform } from './index';
import type { WorkspaceTool } from '../types';

export function useImageWorkspaceController() {
  const library = useImageLibrary();
  const [activeTool, setActiveTool] = useState<WorkspaceTool>('none');
  const [isViewportPanning, setIsViewportPanning] = useState(false);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const {
    isMaskTool,
    handlePointerDown: handleMaskPointerDown,
    handlePointerMove: handleMaskPointerMove,
    handlePointerUp: handleMaskPointerUp,
    handleToolChange: handleMaskToolChange,
    lassoPreview,
    overlayVersion,
    getTintOverlay,
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
      if (handleMaskPointerDown(event, activeTool)) return;

      if (activeTool === 'none' || activeTool === 'pan' || activeTool === 'scale' || activeTool === 'rotate') {
        handlePanPointerDown(event);
      }
    },
    [activeTool, handleMaskPointerDown, handlePanPointerDown]
  );

  const handleViewportPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (handleMaskPointerMove(event)) return;
      handlePanPointerMove(event);
    },
    [handleMaskPointerMove, handlePanPointerMove]
  );

  const handleViewportPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (handleMaskPointerUp(event)) return;
      handlePanPointerUp(event);
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
  }, [activeTool, cancelPan, handleMaskToolChange]);

  useEffect(() => {
    if (!selectedImageId) return;
    forceRedraw();
  }, [forceRedraw, overlayVersion, selectedImageId]);

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
  };
}
