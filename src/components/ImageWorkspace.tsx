'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, PointerEvent as ReactPointerEvent } from 'react';
import Image from 'next/image';
import { Upload } from 'lucide-react';

import { ImageToolbar } from '@/components/ImageToolbar';
import { useImageMasking } from '@/components/mask';
import { useViewportTransform } from '@/components/viewport';

/* ------------------------------------------------------------------
 * Types & Helpers
 * -----------------------------------------------------------------*/
type PreviewImage = {
  id: string;
  name: string;
  url: string;
  file: File;
};

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const MAX_OVERLAY_DIMENSION = 4096;

/* ------------------------------------------------------------------
 * Component
 * -----------------------------------------------------------------*/
export function ImageWorkspace() {
  /* ---------------- State ---------------- */
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<
    'none' | 'pan' | 'scale' | 'rotate' | 'erase' | 'restore'
  >('none');

  const [isDragging, setIsDragging] = useState(false);
  const [isViewportPanning, setIsViewportPanning] = useState(false);

  /* ---------------- Refs ---------------- */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef(new Map<string, string>());
  const dragCounter = useRef(0);

  const previewRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const tintOverlayRef = useRef<HTMLCanvasElement>(null);

  const stripesPatternRef = useRef<HTMLCanvasElement | null>(null);
  const overlayReadyRef = useRef(false);
  const overlayMetricsRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);

  /* ---------------- Derived ---------------- */
  const selectedImage = useMemo(
    () => images.find((img) => img.id === selectedId) ?? images[0] ?? null,
    [images, selectedId]
  );
  const selectedImageId = selectedImage?.id ?? null;

  /* ------------------------------------------------------------------
   * Masking
   * -----------------------------------------------------------------*/
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
    images,
    selectedImageId,
    previewRef,
    imageRef,
    onToggleViewportPanning: setIsViewportPanning,
  });

  /* ------------------------------------------------------------------
   * Overlay Rendering (absolute-positioned + full redraw on pan/zoom)
   * -----------------------------------------------------------------*/
  const ensureStripesPattern = useCallback(() => {
    if (stripesPatternRef.current) return stripesPatternRef.current;

    const scaleFactor = 1 / viewportState.scale;
    const size = 36 * scaleFactor;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-size * 0.5, size);
    ctx.lineTo(size, -size * 0.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, size * 1.5);
    ctx.lineTo(size * 1.5, 0);
    ctx.stroke();

    stripesPatternRef.current = canvas;
    return canvas;
  }, []);

  /** Compute overlay DOM box relative to preview, and position the overlay canvas */
  const updateOverlayMetrics = useCallback(() => {
    const overlay = tintOverlayRef.current;
    const preview = previewRef.current;
    const img = imageRef.current;
    if (!overlay || !preview || !img) return { metrics: null, sizeChanged: false };

    const imageRect = img.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();

    if (!imageRect.width || !imageRect.height) {
      overlay.style.opacity = '0';
      overlayMetricsRef.current = null;
      return { metrics: null, sizeChanged: false };
    }

    const metrics = {
      left: imageRect.left - previewRect.left,
      top: imageRect.top - previewRect.top,
      width: imageRect.width,
      height: imageRect.height,
    };

    overlay.style.left = `${metrics.left}px`;
    overlay.style.top = `${metrics.top}px`;
    overlay.style.width = `${metrics.width}px`;
    overlay.style.height = `${metrics.height}px`;

    const prev = overlayMetricsRef.current;
    const sizeChanged =
      !prev ||
      Math.abs(prev.width - metrics.width) > 0.5 ||
      Math.abs(prev.height - metrics.height) > 0.5;

    overlayMetricsRef.current = metrics;
    return { metrics, sizeChanged };
  }, []);

  /** Paint overlay from current mask tint into the overlay canvas */
  const redrawOverlay = useCallback(
    (metrics?: { width: number; height: number } | null, force = false) => {
      const overlay = tintOverlayRef.current;
      const tint = getTintOverlay();

      if (!overlay || !metrics || !tint || !tint.width || !tint.height) {
        overlayReadyRef.current = false;
        if (overlay) overlay.style.opacity = '0';
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const targetW = metrics.width * dpr;
      const targetH = metrics.height * dpr;
      const maxDim = Math.max(targetW, targetH);
      const clampRatio = maxDim > MAX_OVERLAY_DIMENSION ? MAX_OVERLAY_DIMENSION / maxDim : 1;
      const renderScale = dpr * clampRatio;
      const pixelW = Math.max(1, Math.round(metrics.width * renderScale));
      const pixelH = Math.max(1, Math.round(metrics.height * renderScale));

      if (overlay.width !== pixelW || overlay.height !== pixelH) {
        overlay.width = pixelW;
        overlay.height = pixelH;
        force = true;
      } else if (!force && overlayReadyRef.current) {
        // No need to repaint identical buffer
        return;
      }

      const ctx = overlay.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      ctx.save();
      const renderScaleX = pixelW / metrics.width;
      const renderScaleY = pixelH / metrics.height;
      ctx.setTransform(renderScaleX, 0, 0, renderScaleY, 0, 0);

      // Dark base
      ctx.fillStyle = 'rgba(30, 41, 59, 0.68)';
      ctx.fillRect(0, 0, metrics.width, metrics.height);

      // Stripes on top
      const stripes = ensureStripesPattern();
      if (stripes) {
        const pattern = ctx.createPattern(stripes, 'repeat');
        if (pattern) {
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, metrics.width, metrics.height);
          ctx.globalAlpha = 1;
        }
      }

      // Apply mask alpha
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(tint, 0, 0, tint.width, tint.height, 0, 0, metrics.width, metrics.height);

      ctx.restore();
      overlay.style.opacity = '1';
      overlayReadyRef.current = true;
    },
    [getTintOverlay, ensureStripesPattern]
  );

  /** rAF-throttled callback invoked by viewport hook on any pan/zoom change */
  const handleViewportRender = useCallback(() => {
    const { metrics, sizeChanged } = updateOverlayMetrics();
    if (metrics) {
      redrawOverlay(metrics, sizeChanged);
    }
  }, [redrawOverlay, updateOverlayMetrics]);

  /* ------------------------------------------------------------------
   * Viewport
   * -----------------------------------------------------------------*/
  const {
    viewportState,
    isViewportDefault,
    handlePointerDown: handlePanPointerDown,
    handlePointerMove: handlePanPointerMove,
    handlePointerUp: handlePanPointerUp,
    handleWheel: handleViewportWheel,
    resetViewport,
    cancelPan,
  } = useViewportTransform({
    imageRef,
    previewRef,
    onPanningChange: setIsViewportPanning,
    onViewportUpdate: handleViewportRender, // <— always redraw while panning/zooming
  });

  /* ------------------------------------------------------------------
   * File Handling
   * -----------------------------------------------------------------*/
  const addFiles = useCallback((files: FileList | File[]) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;

    const next = imgs.map((file) => {
      const id = createId();
      const url = URL.createObjectURL(file);
      objectUrls.current.set(id, url);
      return { id, name: file.name, url, file };
    });

    setImages((prev) => [...prev, ...next]);
    setSelectedId((prev) => prev ?? next[0]?.id ?? null);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((x) => x.id === id);
      if (!img) return prev;
      URL.revokeObjectURL(img.url);
      objectUrls.current.delete(id);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files);
      e.target.value = '';
    },
    [addFiles]
  );

  const handleChooseClick = () => fileInputRef.current?.click();

  /* Drag-and-drop */
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  /* ------------------------------------------------------------------
   * Pointer Handling (mask vs pan)
   * -----------------------------------------------------------------*/
  const handleViewportPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if (handleMaskPointerDown(e, activeTool)) return;

      if (['pan', 'scale', 'rotate', 'none'].includes(activeTool)) {
        handlePanPointerDown(e);
      }
    },
    [activeTool, handleMaskPointerDown, handlePanPointerDown]
  );

  const handleViewportPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (handleMaskPointerMove(e)) return;
      handlePanPointerMove(e);
    },
    [handleMaskPointerMove, handlePanPointerMove]
  );

  const handleViewportPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (handleMaskPointerUp(e)) return;
      handlePanPointerUp(e);
    },
    [handleMaskPointerUp, handlePanPointerUp]
  );

  /* ------------------------------------------------------------------
   * Effects
   * -----------------------------------------------------------------*/
  // Reset viewport on selection change
  useEffect(() => resetViewport(), [resetViewport, selectedId]);

  // Tool changes: stop ongoing gestures
  useEffect(() => {
    cancelPan();
    handleMaskToolChange();
    setIsViewportPanning(false);
  }, [activeTool, cancelPan, handleMaskToolChange]);

  // Redraw overlay when mask content changes or selection changes
  useEffect(() => {
    if (!selectedImageId) {
      if (tintOverlayRef.current) tintOverlayRef.current.style.opacity = '0';
      overlayReadyRef.current = false;
      return;
    }
    const { metrics } = updateOverlayMetrics();
    if (metrics) redrawOverlay(metrics, true);
  }, [overlayVersion, redrawOverlay, selectedImageId, updateOverlayMetrics]);

  // Redraw on window resize
  useEffect(() => {
    const onResize = () => {
      overlayReadyRef.current = false;
      const { metrics } = updateOverlayMetrics();
      if (metrics) redrawOverlay(metrics, true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateOverlayMetrics, redrawOverlay]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    };
  }, []);

  /* ------------------------------------------------------------------
   * Rendering
   * -----------------------------------------------------------------*/
  const canvasClass = isDragging
    ? 'report-create__canvas report-create__canvas--dragging'
    : 'report-create__canvas';

  const isMaskToolActive = isMaskTool(activeTool);

  const imageTransform = useMemo(
    () =>
      `translate3d(${viewportState.offset.x}px, ${viewportState.offset.y}px, 0) scale(${viewportState.scale})`,
    [viewportState]
  );

  const previewW = previewRef.current?.clientWidth ?? 0;
  const previewH = previewRef.current?.clientHeight ?? 0;
  const lassoSegments =
    lassoPreview && previewW && previewH && lassoPreview.points.length
      ? lassoPreview.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      : null;
  const lassoPath = lassoSegments?.join(' ');
  const lassoClosed = lassoPreview && lassoPreview.points.length > 2 && lassoPath ? `${lassoPath} Z` : null;
  const lassoStroke =
    lassoPreview?.tool === 'erase' ? 'rgba(248,113,113,0.9)' : 'rgba(56,189,248,0.9)';

  return (
    <section
      className={canvasClass}
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="sr-only"
        onChange={handleFileInputChange}
      />

      {images.length === 0 ? (
        /* Empty state */
        <div className={`report-create__dropzone${isDragging ? ' report-create__dropzone--active' : ''}`}>
          <Upload className="report-create__dropzone-icon" strokeWidth={1.8} />
          <p className="report-create__dropzone-text">Drag and drop images here</p>
          <span className="report-create__dropzone-separator">or</span>
          <button type="button" className="report-create__choose" onClick={handleChooseClick}>
            <span aria-hidden className="report-create__choose-icon">+</span>
            Choose Images
          </button>
        </div>
      ) : (
        /* Workspace */
        <div className="report-create__workspace">
          <ImageToolbar
            activeTool={activeTool}
            onToolChange={(tool) => setActiveTool((prev) => (prev === tool ? 'none' : tool))}
            onUndo={() => undefined}
            canUndo={false}
            onResetViewport={resetViewport}
            canResetViewport={!isViewportDefault}
          />

          <div className="report-create__gallery">
            {selectedImage && (
              <div
                ref={previewRef}
                className={`report-create__preview${isViewportPanning ? ' report-create__preview--panning' : ''}${
                  isMaskToolActive ? ' report-create__preview--mask' : ''
                }`}
                onPointerDown={handleViewportPointerDown}
                onPointerMove={handleViewportPointerMove}
                onPointerUp={handleViewportPointerUp}
                onPointerLeave={handleViewportPointerUp}
                onPointerCancel={handleViewportPointerUp}
                onWheel={handleViewportWheel}
              >
                <div className="report-create__preview-layer">
                  <Image
                    ref={imageRef}
                    src={selectedImage.url}
                    alt={selectedImage.name}
                    fill
                    unoptimized
                    sizes="100vw"
                    style={{ transform: imageTransform, objectFit: 'contain' }}
                  />
                  {/* Absolute overlay canvas; re-painted each rAF during pan/zoom */}
                  <canvas ref={tintOverlayRef} className="report-create__mask-overlay" aria-hidden />
                  {lassoPath && (
                    <svg
                      className="report-create__lasso-overlay"
                      viewBox={`0 0 ${previewW} ${previewH}`}
                      preserveAspectRatio="none"
                    >
                      {lassoClosed && (
                        <path
                          d={lassoClosed}
                          className="report-create__lasso-fill"
                          fill={lassoPreview?.tool === 'erase' ? 'rgba(248,113,113,0.08)' : 'rgba(56,189,248,0.08)'}
                        />
                      )}
                      <path
                        d={lassoPath}
                        className="report-create__lasso-path"
                        stroke={lassoStroke}
                        strokeWidth={2}
                        strokeDasharray="6 6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      {lassoPreview?.points.length ? (
                        <>
                          <circle
                            className="report-create__lasso-point"
                            cx={lassoPreview.points[0].x}
                            cy={lassoPreview.points[0].y}
                            r={4}
                            stroke={lassoStroke}
                            strokeWidth={2}
                            fill="#0f172a"
                          />
                          <circle
                            className="report-create__lasso-point"
                            cx={lassoPreview.points[lassoPreview.points.length - 1].x}
                            cy={lassoPreview.points[lassoPreview.points.length - 1].y}
                            r={3}
                            fill={lassoStroke}
                          />
                        </>
                      ) : null}
                    </svg>
                  )}
                </div>
              </div>
            )}

            {/* Thumbnails */}
            <div className="report-create__thumbs" role="list">
              {images.map((img) => {
                const isActive = img.id === selectedImage?.id;
                return (
                  <div
                    key={img.id}
                    className={`report-create__thumb${isActive ? ' report-create__thumb--active' : ''}`}
                    role="listitem"
                  >
                    <button
                      type="button"
                      className="report-create__thumb-select"
                      onClick={() => setSelectedId(img.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Delete') {
                          e.preventDefault();
                          removeImage(img.id);
                        }
                      }}
                    >
                      <Image
                        src={img.url}
                        alt={img.name}
                        width={64}
                        height={64}
                        unoptimized
                        className="report-create__thumb-image"
                      />
                    </button>
                    <button
                      type="button"
                      className="report-create__thumb-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(img.id);
                      }}
                      aria-label={`Remove ${img.name}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                className="report-create__thumb report-create__thumb--add"
                onClick={handleChooseClick}
              >
                <span aria-hidden className="report-create__thumb-add">+</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
