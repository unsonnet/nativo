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
  isReportSubmitting?: boolean; // Disable tools and hide add images during report submission
};

export function ImageWorkspace({ gridEnabled = false, dimensions, onImagesChange, onImages, isReportSubmitting = false }: ImageWorkspaceProps) {
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
    selectionState,
    overlayVersion,
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
        
        // Check if mask has been modified from its initial state (all white)
        let mask: string | undefined = undefined;
        if (maskCanvas) {
          const ctx = maskCanvas.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
            const pixels = imageData.data;
            let hasBeenModified = false;
            
            // Check if any pixel has been erased (alpha < 255 or RGB < 250)
            // Check a sample of pixels to improve performance for large images
            const sampleSize = Math.min(pixels.length, 40000); // Sample max 10k pixels (40k bytes)
            const step = Math.max(4, Math.floor(pixels.length / sampleSize));
            
            for (let i = 0; i < pixels.length; i += step) {
              const r = pixels[i];
              const g = pixels[i + 1];
              const b = pixels[i + 2];
              const a = pixels[i + 3];
              
              // Check if pixel has been modified from initial white (255,255,255,255)
              // Allow for small variations in RGB (< 250) or any transparency (alpha < 255)
              if (r < 250 || g < 250 || b < 250 || a < 255) {
                hasBeenModified = true;
                break;
              }
            }
            
            if (hasBeenModified) {
              mask = maskCanvas.toDataURL('image/png');
            }
          }
        }

        // selection handling - check if this image should have a selection based on current dimensions
        let selection: ProductImage['selection'] | undefined = undefined;
        let positionNormalized = { x: 0.5, y: 0.5 };
        
        if (typeof getSelectionForImage === 'function') {
          try {
            // For currently selected image, use live selectionState; for others use persisted state
            const raw = i.id === library.selectedId ? selectionState : getSelectionForImage(i.id);
            
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

                // Get metrics - this might only work for currently selected image
                const metrics = typeof getOverlayMetrics === 'function' ? getOverlayMetrics() : null;
                
                if (metrics && metrics.width > 0 && metrics.height > 0) {
                  const nx = 0.5 + (offset.x ?? 0) / metrics.width;
                  const ny = 0.5 + (offset.y ?? 0) / metrics.height;
                  positionNormalized = { x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) };
                } else {
                  // If no metrics available, try to use offset as-is if it seems reasonable
                  // Assume typical image viewport size for fallback normalization
                  const fallbackWidth = 800;
                  const fallbackHeight = 600;
                  if (Math.abs(offset.x) < fallbackWidth && Math.abs(offset.y) < fallbackHeight) {
                    const nx = 0.5 + (offset.x ?? 0) / fallbackWidth;
                    const ny = 0.5 + (offset.y ?? 0) / fallbackHeight;
                    positionNormalized = { x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) };
                  }
                }

                selection = {
                  shape: { width: selCandidate.width, height: selCandidate.length },
                  position: { x: positionNormalized.x, y: positionNormalized.y },
                  scale,
                  rotation: rot,
                };
              }
            } else if (dimensions && dimensions.length && dimensions.width) {
              // If no existing selection but dimensions are provided, create a default centered selection
              selection = {
                shape: { width: dimensions.width, height: dimensions.length },
                position: { x: 0.5, y: 0.5 },
                scale: 1,
                rotation: { x: 0, y: 0, z: 0, w: 1 },
              };
            }
          } catch {
            // If there's an error getting selection but dimensions exist, create default
            if (dimensions && dimensions.length && dimensions.width) {
              selection = {
                shape: { width: dimensions.width, height: dimensions.length },
                position: { x: 0.5, y: 0.5 },
                scale: 1,
                rotation: { x: 0, y: 0, z: 0, w: 1 },
              };
            }
          }
        } else if (dimensions && dimensions.length && dimensions.width) {
          // If getSelectionForImage is not available but dimensions exist, create default
          selection = {
            shape: { width: dimensions.width, height: dimensions.length },
            position: { x: 0.5, y: 0.5 },
            scale: 1,
            rotation: { x: 0, y: 0, z: 0, w: 1 },
          };
        }

        return { id: i.id, name: i.name, url: i.url, mask, selection };
      });

      onImages?.(imgs);
    } catch {
      // ignore
    }
  // library.images and library.selectedId reflect the image set & selection; keep controller getters too
  // overlayVersion changes when mask is modified, triggering updates for current image
  }, [library.images, library.selectedId, getMaskCanvas, getSelectionState, getSelectionForImage, getOverlayMetrics, onImagesChange, onImages, dimensions, selectionState, overlayVersion]);

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

      {!hasImages && !isReportSubmitting ? (
        <Dropzone
          isDragging={library.isDragging}
          onChooseClick={library.handleChooseClick}
          onDragEnter={library.handleDragEnter}
          onDragLeave={library.handleDragLeave}
          onDrop={library.handleDrop}
        />
      ) : hasImages ? (
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
            isReportSubmitting={isReportSubmitting}
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
              isReportSubmitting={isReportSubmitting}
            />
          </PreviewCanvas>
        </div>
      ) : null}
    </section>
  );
}
