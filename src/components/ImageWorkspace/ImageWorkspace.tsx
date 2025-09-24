'use client';

import { Dropzone, PreviewCanvas, ThumbnailList, Toolbar } from './components';
import { useImageWorkspaceController } from './hooks';
import { useEffect, useRef } from 'react';

import './styles/workspace.css';

type ImageWorkspaceProps = {
  gridEnabled?: boolean;
  dimensions?: { length: number | null; width: number | null; thickness: number | null };
  onImagesChange?: (count: number) => void;
};

export function ImageWorkspace({ gridEnabled = false, dimensions, onImagesChange }: ImageWorkspaceProps) {
  const {
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
    forceRedraw,
    lassoPreview,
    isMaskToolActive,
    isViewportDefault,
    resetViewport,
    isViewportPanning,
    imageTransform,
    modifierActive,
    tempToolOverride,
    maskVisible,
    setMaskVisible,
    undo,
    canUndo,
    setSelectionDimensions,
  selectionVisible,
  setSelectionVisible,
  } = useImageWorkspaceController();

  // read current per-image selection state (offset + scale) from controller
  // `selectionState` is updated by the overlay hook when selection moves/scales

  // keep overlay selection in sync with passed dimensions
  const prevDimsRef = useRef<typeof dimensions | null>(null);

  useEffect(() => {
    try {
      setSelectionDimensions?.(dimensions ?? null);
    } catch {
      // ignore
    }
    // ensure redraw
    try {
      if (dimensions) forceRedraw();
    } catch {
      // ignore
    }
    // if dimensions are cleared, hide selection; if they just became filled, show selection
    try {
      const had = prevDimsRef.current;
      const have = dimensions;
      const hadFilled = !!(had && had.length && had.width);
      const haveFilled = !!(have && have.length && have.width);
      if (!haveFilled) {
        setSelectionVisible(false);
      } else if (!hadFilled && haveFilled) {
        // first time filled -> make visible by default
        setSelectionVisible(true);
      }
      prevDimsRef.current = dimensions ?? null;
    } catch {
      // ignore
    }
  // also run when selected image changes so provided `dimensions` are applied
  // to the newly selected image. Keep other calls limited to avoid extra updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions, library.selectedImage?.id]);

  const canvasClass = library.isDragging
    ? 'image-workspace__canvas image-workspace__canvas--dragging'
    : 'image-workspace__canvas';

  const hasImages = library.images.length > 0 && library.selectedImage;

  useEffect(() => {
    try {
      onImagesChange?.(library.images.length);
    } catch {
      // ignore
    }
  }, [library.images.length, onImagesChange]);

  return (
    <section
      className={canvasClass}
      onDragEnter={library.handleDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={library.handleDragLeave}
      onDrop={library.handleDrop}
    >
      <input
        ref={library.fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="sr-only"
        onChange={library.handleFileInputChange}
      />

      {!hasImages ? (
        <Dropzone
          isDragging={library.isDragging}
          onChooseClick={library.handleChooseClick}
          onDragEnter={library.handleDragEnter}
          onDragLeave={library.handleDragLeave}
          onDrop={library.handleDrop}
        />
      ) : (
        <div className="image-workspace__workspace">
          <Toolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            gridEnabled={gridEnabled}
            modifierActive={modifierActive}
            tempActiveTool={tempToolOverride}
            maskVisible={maskVisible}
            onToggleMaskVisible={setMaskVisible}
            selectionVisible={selectionVisible}
            onToggleSelectionVisible={setSelectionVisible}
            onUndo={undo}
            canUndo={canUndo()}
            onResetViewport={resetViewport}
            canResetViewport={!isViewportDefault}
          />

          <PreviewCanvas
            previewRef={previewRef as React.RefObject<HTMLDivElement>}
            imageRef={imageRef as React.RefObject<HTMLImageElement>}
            tintOverlayRef={tintOverlayRef}
            selectedImage={library.selectedImage!}
            imageTransform={imageTransform}
            isViewportPanning={isViewportPanning}
            isMaskToolActive={isMaskToolActive}
            lassoPreview={lassoPreview}
            onPointerDown={handleViewportPointerDown}
            onPointerMove={handleViewportPointerMove}
            onPointerUp={handleViewportPointerUp}
            onWheel={handleWheel}
            // pass dimensions for middle overlay
          >
            <ThumbnailList
              images={library.images}
              selectedId={library.selectedId}
              onSelect={library.setSelectedId}
              onRemove={library.removeImage}
              onAdd={library.handleChooseClick}
            />
          </PreviewCanvas>
        </div>
      )}
    </section>
  );
}
