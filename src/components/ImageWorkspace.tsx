'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, PointerEvent as ReactPointerEvent } from 'react';
import Image from 'next/image';
import { Upload } from 'lucide-react';

import { ImageToolbar } from '@/components/ImageToolbar';
import { useImageMasking } from '@/components/mask';
import { useViewportTransform } from '@/components/viewport';

type PreviewImage = {
  id: string;
  name: string;
  url: string;
  file: File;
};

const createId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function ImageWorkspace() {
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTool, setActiveTool] = useState<
    'none' | 'pan' | 'scale' | 'rotate' | 'erase' | 'restore'
  >('none');

  const [isViewportPanning, setIsViewportPanning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef(new Map<string, string>());
  const dragCounter = useRef(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const tintOverlayRef = useRef<HTMLCanvasElement>(null);
  const stripesPatternRef = useRef<HTMLCanvasElement | null>(null);
  const overlayMetricsRef = useRef<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const overlayReadyRef = useRef(false);
  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedId) ?? images[0] ?? null,
    [images, selectedId]
  );
  const selectedImageId = selectedImage?.id ?? null;

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

  const ensureStripesPattern = useCallback(() => {
    if (stripesPatternRef.current) {
      return stripesPatternRef.current;
    }

    const patternCanvas = document.createElement('canvas');
    const size = 36;
    patternCanvas.width = size;
    patternCanvas.height = size;
    const patternCtx = patternCanvas.getContext('2d');
    if (!patternCtx) {
      return null;
    }

    patternCtx.clearRect(0, 0, size, size);
    patternCtx.strokeStyle = 'rgba(30, 41, 59, 0.9)';
    patternCtx.lineWidth = 8;
    patternCtx.lineCap = 'round';
    patternCtx.beginPath();
    patternCtx.moveTo(-size * 0.5, size);
    patternCtx.lineTo(size, -size * 0.5);
    patternCtx.stroke();
    patternCtx.beginPath();
    patternCtx.moveTo(0, size * 1.5);
    patternCtx.lineTo(size * 1.5, 0);
    patternCtx.stroke();

    stripesPatternRef.current = patternCanvas;
    return patternCanvas;
  }, []);

  const updateOverlayMetrics = useCallback(() => {
    const overlayCanvas = tintOverlayRef.current;
    const previewEl = previewRef.current;
    const imageEl = imageRef.current;

    if (!overlayCanvas || !previewEl || !imageEl) {
      overlayMetricsRef.current = null;
      return { metrics: null, sizeChanged: false };
    }

    const imageRect = imageEl.getBoundingClientRect();
    const previewRect = previewEl.getBoundingClientRect();
    if (imageRect.width <= 0 || imageRect.height <= 0) {
      overlayCanvas.style.opacity = '0';
      overlayMetricsRef.current = null;
      return { metrics: null, sizeChanged: false };
    }

    const left = imageRect.left - previewRect.left;
    const top = imageRect.top - previewRect.top;
    const width = imageRect.width;
    const height = imageRect.height;

    overlayCanvas.style.left = `${left}px`;
    overlayCanvas.style.top = `${top}px`;
    overlayCanvas.style.width = `${width}px`;
    overlayCanvas.style.height = `${height}px`;

    const previous = overlayMetricsRef.current;
    const sizeChanged =
      !previous ||
      Math.abs(previous.width - width) > 0.5 ||
      Math.abs(previous.height - height) > 0.5;

    overlayMetricsRef.current = { left, top, width, height };
    return { metrics: overlayMetricsRef.current, sizeChanged };
  }, [imageRef, previewRef, tintOverlayRef]);

  const redrawOverlay = useCallback(
    (metrics?: { width: number; height: number } | null, force = false) => {
      const overlayCanvas = tintOverlayRef.current;
      if (!overlayCanvas) {
        return;
      }

      const targetMetrics = metrics ?? overlayMetricsRef.current;
      const tintCanvas = getTintOverlay();
      if (
        !targetMetrics ||
        targetMetrics.width <= 0 ||
        targetMetrics.height <= 0 ||
        !tintCanvas ||
        tintCanvas.width === 0 ||
        tintCanvas.height === 0
      ) {
        overlayCanvas.style.opacity = '0';
        overlayReadyRef.current = false;
        return;
      }

      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const pixelWidth = Math.max(1, Math.round(targetMetrics.width * dpr));
      const pixelHeight = Math.max(1, Math.round(targetMetrics.height * dpr));

      if (overlayCanvas.width !== pixelWidth || overlayCanvas.height !== pixelHeight) {
        overlayCanvas.width = pixelWidth;
        overlayCanvas.height = pixelHeight;
        force = true;
      } else if (!force && overlayReadyRef.current) {
        return;
      }

      const ctx = overlayCanvas.getContext('2d');
      if (!ctx) {
        overlayCanvas.style.opacity = '0';
        overlayReadyRef.current = false;
        return;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = 'rgba(30, 41, 59, 0.68)';
      ctx.fillRect(0, 0, targetMetrics.width, targetMetrics.height);

      const stripesCanvas = ensureStripesPattern();
      if (stripesCanvas) {
        const pattern = ctx.createPattern(stripesCanvas, 'repeat');
        if (pattern) {
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, targetMetrics.width, targetMetrics.height);
        }
      }

      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(
        tintCanvas,
        0,
        0,
        tintCanvas.width,
        tintCanvas.height,
        0,
        0,
        targetMetrics.width,
        targetMetrics.height
      );
      ctx.restore();

      overlayCanvas.style.opacity = '1';
      overlayReadyRef.current = true;
    },
    [ensureStripesPattern, getTintOverlay]
  );

  const handleViewportRender = useCallback(() => {
    const { metrics, sizeChanged } = updateOverlayMetrics();
    if (metrics) {
      redrawOverlay(metrics, sizeChanged);
    }
  }, [redrawOverlay, updateOverlayMetrics]);

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
    onViewportUpdate: handleViewportRender,
  });

  useEffect(() => {
    resetViewport();
  }, [resetViewport, selectedId]);

  useEffect(() => {
    cancelPan();
    handleMaskToolChange();
    setIsViewportPanning(false);
  }, [activeTool, cancelPan, handleMaskToolChange]);

  useEffect(() => {
    if (!selectedImageId) {
      const overlayCanvas = tintOverlayRef.current;
      if (overlayCanvas) {
        overlayCanvas.style.opacity = '0';
      }
      overlayMetricsRef.current = null;
      overlayReadyRef.current = false;
      return;
    }

    overlayReadyRef.current = false;
    const { metrics } = updateOverlayMetrics();
    if (metrics) {
      redrawOverlay(metrics, true);
    }
  }, [overlayVersion, redrawOverlay, selectedImageId, updateOverlayMetrics]);

  useEffect(() => {
    overlayReadyRef.current = false;
    handleViewportRender();
  }, [handleViewportRender, selectedImageId]);

  useEffect(() => {
    const handleResize = () => {
      overlayReadyRef.current = false;
      handleViewportRender();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleViewportRender]);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList).filter((file) =>
      file.type.startsWith('image/')
    );

    if (filesArray.length === 0) {
      return;
    }

    const nextImages = filesArray.map((file) => {
      const id = createId();
      const url = URL.createObjectURL(file);
      objectUrls.current.set(id, url);
      return {
        id,
        name: file.name,
        url,
        file,
      };
    });

    setImages((prev) => [...prev, ...nextImages]);
    setSelectedId((prev) => prev ?? nextImages[0]?.id ?? null);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (!target) {
        return prev;
      }
      URL.revokeObjectURL(target.url);
      objectUrls.current.delete(id);
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        addFiles(event.target.files);
        event.target.value = '';
      }
    },
    [addFiles]
  );

  const handleChooseClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        addFiles(event.dataTransfer.files);
        event.dataTransfer.clearData();
      }
    },
    [addFiles]
  );

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const handleViewportPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      if (handleMaskPointerDown(event, activeTool)) {
        return;
      }

      const panToolActive =
        activeTool === 'pan' ||
        activeTool === 'none' ||
        activeTool === 'scale' ||
        activeTool === 'rotate';

      if (!panToolActive) {
        return;
      }

      handlePanPointerDown(event);
    },
    [activeTool, handleMaskPointerDown, handlePanPointerDown]
  );

  const handleViewportPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (handleMaskPointerMove(event)) {
        return;
      }

      if (handlePanPointerMove(event)) {
        return;
      }
    },
    [handleMaskPointerMove, handlePanPointerMove]
  );

  const releaseViewportPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (handleMaskPointerUp(event)) {
        return;
      }

      handlePanPointerUp(event);
    },
    [handleMaskPointerUp, handlePanPointerUp]
  );

  const handleResetViewport = useCallback(() => {
    resetViewport();
  }, [resetViewport]);

  const canvasClassName = isDragging
    ? 'report-create__canvas report-create__canvas--dragging'
    : 'report-create__canvas';
  const isMaskToolActive = isMaskTool(activeTool);
  const imageTransform = useMemo(
    () =>
      `translate3d(${viewportState.offset.x}px, ${viewportState.offset.y}px, 0) scale(${viewportState.scale})`,
    [viewportState.offset.x, viewportState.offset.y, viewportState.scale]
  );
  const previewElement = previewRef.current;
  const previewWidth = previewElement?.clientWidth ?? 0;
  const previewHeight = previewElement?.clientHeight ?? 0;
  const lassoPathSegments = lassoPreview && previewWidth > 0 && previewHeight > 0 && lassoPreview.points.length > 0
    ? lassoPreview.points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    : null;
  const lassoPathData = lassoPathSegments ? lassoPathSegments.join(' ') : null;
  const lassoClosedPath = lassoPreview && lassoPreview.points.length > 2 && lassoPathData
    ? `${lassoPathData} Z`
    : null;
  const lassoStroke = lassoPreview?.tool === 'erase' ? 'rgba(248, 113, 113, 0.9)' : 'rgba(56, 189, 248, 0.9)';

  return (
    <section
      className={canvasClassName}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="sr-only"
        onChange={handleFileInputChange}
      />

      {images.length === 0 ? (
        <div
          className={`report-create__dropzone${
            isDragging ? ' report-create__dropzone--active' : ''
          }`}
          role="presentation"
        >
          <Upload className="report-create__dropzone-icon" strokeWidth={1.8} />
          <p className="report-create__dropzone-text">Drag and drop images here</p>
          <span className="report-create__dropzone-separator">or</span>
          <button type="button" className="report-create__choose" onClick={handleChooseClick}>
            <span aria-hidden className="report-create__choose-icon">+</span>
            Choose Images
          </button>
        </div>
      ) : (
        <div className="report-create__workspace">
          <ImageToolbar
            activeTool={activeTool}
            onToolChange={(tool) => setActiveTool((prev) => (prev === tool ? 'none' : tool))}
            onUndo={() => undefined}
            canUndo={false}
            onResetViewport={handleResetViewport}
            canResetViewport={!isViewportDefault}
          />
          <div className="report-create__gallery">
            {selectedImage && (
              <div
                ref={previewRef}
                className={`report-create__preview${
                  isViewportPanning ? ' report-create__preview--panning' : ''
                }${isMaskToolActive ? ' report-create__preview--mask' : ''}`}
                onPointerDown={handleViewportPointerDown}
                onPointerMove={handleViewportPointerMove}
                onPointerUp={releaseViewportPointer}
                onPointerLeave={releaseViewportPointer}
                onPointerCancel={releaseViewportPointer}
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
                    style={{
                      transform: imageTransform,
                      objectFit: 'contain',
                    }}
                  />
                  <canvas ref={tintOverlayRef} className="report-create__mask-overlay" aria-hidden />
                  {lassoPathData && previewWidth > 0 && previewHeight > 0 && (
                    <svg
                      className="report-create__lasso-overlay"
                      viewBox={`0 0 ${previewWidth} ${previewHeight}`}
                      preserveAspectRatio="none"
                    >
                      {lassoClosedPath && (
                        <path
                          d={lassoClosedPath}
                          className="report-create__lasso-fill"
                          fill={lassoPreview?.tool === 'erase' ? 'rgba(248, 113, 113, 0.08)' : 'rgba(56, 189, 248, 0.08)'}
                        />
                      )}
                      <path
                        d={lassoPathData}
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

            <div className="report-create__thumbs" role="list">
              {images.map((image) => {
                const isActive = image.id === selectedImage?.id;
                return (
                  <div
                    key={image.id}
                    className={`report-create__thumb${
                      isActive ? ' report-create__thumb--active' : ''
                    }`}
                    role="listitem"
                  >
                    <button
                      type="button"
                      className="report-create__thumb-select"
                      onClick={() => setSelectedId(image.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Delete') {
                          event.preventDefault();
                          removeImage(image.id);
                        }
                      }}
                    >
                      <Image
                        src={image.url}
                        alt={image.name}
                        width={64}
                        height={64}
                        unoptimized
                        className="report-create__thumb-image"
                      />
                    </button>

                    <button
                      type="button"
                      className="report-create__thumb-remove"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeImage(image.id);
                      }}
                      aria-label={`Remove ${image.name}`}
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
