"use client";

import { Dropzone, PreviewCanvas, ThumbnailList, Toolbar } from './components';
import { useImageWorkspaceController } from './hooks';
import { useEffect, useRef } from 'react';
import type { ProductImage } from '@/types/report';

import './styles/workspace.css';

// Internal helper types for normalizing controller selection state without unsafe casts
type SelectionValsLike = { length: number | null; width: number | null; thickness?: number | null } | null;
type SelectionStateLike = {
  sel?: SelectionValsLike;
  offset?: { x: number; y: number };
  scale?: number;
  rotation?: { x: number; y: number; z: number; w: number } | null;
} | SelectionValsLike;

function isSelectionStateLike(v: unknown): v is SelectionStateLike {
  if (v == null) return false;
  if (typeof v !== 'object') return false;
  return true;
}

function hasSelProp(v: unknown): v is { sel?: SelectionValsLike } {
  return v != null && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'sel');
}

type ImageWorkspaceProps = {
  gridEnabled?: boolean;
  dimensions?: { length: number | null; width: number | null; thickness: number | null };
  onImagesChange?: (count: number) => void;
  onImages?: (images: { id: string; name: string; url: string; mask?: string; selection?: ProductImage['selection'] }[]) => void;
};

export function ImageWorkspace({ gridEnabled = false, dimensions, onImagesChange, onImages }: ImageWorkspaceProps) {
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
    // controller helpers we need for safe exports
    getMaskCanvas,
    getSelectionState,
    getSelectionForImage,
    getOverlayMetrics,
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

      const imgs = library.images.map((i) => {
        // ask controller for the mask canvas for this image id
        const maskCanvas = typeof getMaskCanvas === 'function' ? getMaskCanvas(i.id) : null;
        const mask = maskCanvas ? maskCanvas.toDataURL('image/png') : undefined;

        // selection is only available for the currently selected image via controller
  let selection: ProductImage['selection'] | undefined = undefined;
  let positionNormalized = { x: 0.5, y: 0.5 };
        if (typeof getSelectionForImage === 'function') {
          try {
            const raw = getSelectionForImage(i.id);
            if (isSelectionStateLike(raw)) {
              const selCandidate: SelectionValsLike = hasSelProp(raw) ? raw.sel ?? null : (raw as SelectionValsLike);
              if (selCandidate && selCandidate.length != null && selCandidate.width != null) {
                // raw may be either the sel-only shape or an object with offset/scale/rotation
                let offset = { x: 0, y: 0 };
                let scale = 1;
                let rot = { x: 0, y: 0, z: 0, w: 1 };
                if (hasSelProp(raw)) {
                  const obj = raw as { offset?: { x: number; y: number }; scale?: number; rotation?: { x: number; y: number; z: number; w: number } | null };
                  offset = obj.offset ?? offset;
                  scale = obj.scale ?? scale;
                  rot = obj.rotation ?? rot;
                }

                const metrics = typeof getOverlayMetrics === 'function' ? getOverlayMetrics() : null;
                if (metrics && metrics.width > 0 && metrics.height > 0) {
                  const nx = 0.5 + (offset.x ?? 0) / metrics.width;
                  const ny = 0.5 + (offset.y ?? 0) / metrics.height;
                  positionNormalized = { x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) };
                }

                selection = {
                  shape: { width: selCandidate.width, height: selCandidate.length },
                  position: { x: offset.x ?? 0, y: offset.y ?? 0 },
                  scale,
                  rotation: rot,
                };
              }
            }
          } catch {
            selection = undefined;
          }
        }

  return { id: i.id, name: i.name, url: i.url, mask, selection, positionNormalized };
      });

      onImages?.(imgs);
    } catch {
      // ignore
    }
  // library.images and library.selectedId reflect the image set & selection; keep controller getters too
  }, [library.images, library.selectedId, getMaskCanvas, getSelectionState, getSelectionForImage, getOverlayMetrics, onImagesChange, onImages]);

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
