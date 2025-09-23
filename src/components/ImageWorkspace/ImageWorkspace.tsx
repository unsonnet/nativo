'use client';

import { Dropzone } from './components/Dropzone';
import { PreviewCanvas } from './components/PreviewCanvas';
import { ThumbnailList } from './components/ThumbnailList';
import { Toolbar } from './components/Toolbar';
import { useImageWorkspaceController } from './hooks/useImageWorkspaceController';
import { useEffect } from 'react';
import { useRef } from 'react';

import './styles/workspace.css';

type ImageWorkspaceProps = {
  gridEnabled?: boolean;
  dimensions?: { length: number | null; width: number | null; thickness: number | null };
};

export function ImageWorkspace({ gridEnabled = false, dimensions }: ImageWorkspaceProps) {
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

  // keep overlay selection in sync with passed dimensions
  const prevDimsRef = useRef<typeof dimensions | null>(null);

  useEffect(() => {
    try {
      // @ts-ignore
      setSelectionDimensions?.(dimensions ?? null);
    } catch (err) {
      // ignore
    }
    // ensure redraw
    try {
      // @ts-ignore
      if (dimensions) forceRedraw();
    } catch (err) {
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
    } catch (err) {
      // ignore
    }
  }, [dimensions, setSelectionDimensions, forceRedraw]);

  const canvasClass = library.isDragging
    ? 'image-workspace__canvas image-workspace__canvas--dragging'
    : 'image-workspace__canvas';

  const hasImages = library.images.length > 0 && library.selectedImage;

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
            previewRef={previewRef}
            imageRef={imageRef}
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
            dimensions={dimensions}
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
