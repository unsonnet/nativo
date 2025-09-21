'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ChangeEvent,
  DragEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from 'react';
import { Upload } from 'lucide-react';

import { ImageToolbar } from '@/components/ImageToolbar';

type PreviewImage = {
  id: string;
  name: string;
  url: string;
  file: File;
};

type ViewportState = {
  scale: number;
  offset: { x: number; y: number };
};

const createId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const createDefaultViewport = (): ViewportState => ({
  scale: 1,
  offset: { x: 0, y: 0 },
});

export function ImageWorkspace() {
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTool, setActiveTool] = useState<
    'none' | 'pan' | 'scale' | 'rotate' | 'mask-add' | 'mask-subtract'
  >('none');

  const [viewportState, setViewportState] = useState<ViewportState>(createDefaultViewport);
  const viewportRef = useRef<ViewportState>(viewportState);
  const viewportRafRef = useRef<number | null>(null);
  const [isViewportPanning, setIsViewportPanning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef(new Map<string, string>());
  const dragCounter = useRef(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const pointerState = useRef<
    | {
        pointerId: number;
        startX: number;
        startY: number;
        startOffset: { x: number; y: number };
      }
    | null
  >(null);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedId) ?? images[0] ?? null,
    [images, selectedId]
  );

  useEffect(() => {
    if (images.length > 0 && !images.some((image) => image.id === selectedId)) {
      setSelectedId(images[0].id);
    }
    if (images.length === 0) {
      setSelectedId(null);
    }
  }, [images, selectedId]);

  const scheduleViewportRender = useCallback(() => {
    if (viewportRafRef.current !== null) {
      return;
    }
    viewportRafRef.current = requestAnimationFrame(() => {
      viewportRafRef.current = null;
      setViewportState({
        scale: viewportRef.current.scale,
        offset: { ...viewportRef.current.offset },
      });
    });
  }, []);

  const applyViewport = useCallback(
    (next: ViewportState) => {
      viewportRef.current = {
        scale: next.scale,
        offset: { x: next.offset.x, y: next.offset.y },
      };
      if (previewRef.current) {
        previewRef.current.style.transform = `translate3d(${viewportRef.current.offset.x}px, ${viewportRef.current.offset.y}px, 0) scale(${viewportRef.current.scale})`;
      }
      scheduleViewportRender();
    },
    [scheduleViewportRender]
  );

  const updateViewport = useCallback(
    (
      updater: ViewportState | ((prev: ViewportState) => ViewportState)
    ) => {
      const next =
        typeof updater === 'function'
          ? (updater as (prev: ViewportState) => ViewportState)(viewportRef.current)
          : updater;
      applyViewport(next);
    },
    [applyViewport]
  );

  useEffect(() => {
    viewportRef.current = viewportState;
  }, [viewportState]);

  useEffect(() => {
    const defaultViewport = createDefaultViewport();
    applyViewport(defaultViewport);
    pointerState.current = null;
    setIsViewportPanning(false);
  }, [selectedId, applyViewport]);

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
      if (viewportRafRef.current !== null) {
        cancelAnimationFrame(viewportRafRef.current);
      }
    };
  }, []);

  const handleViewportPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || !previewRef.current) {
        return;
      }
      event.preventDefault();
      previewRef.current.setPointerCapture(event.pointerId);
      pointerState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffset: { ...viewportRef.current.offset },
      };
      setIsViewportPanning(true);
    },
    []
  );

  const handleViewportPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointerState.current || pointerState.current.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const dx = event.clientX - pointerState.current.startX;
    const dy = event.clientY - pointerState.current.startY;
    const { startOffset } = pointerState.current;
    updateViewport({
      scale: viewportRef.current.scale,
      offset: {
        x: startOffset.x + dx,
        y: startOffset.y + dy,
      },
    });
  }, [updateViewport]);

  const releaseViewportPointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerState.current && event.pointerId === pointerState.current.pointerId) {
      previewRef.current?.releasePointerCapture(event.pointerId);
      pointerState.current = null;
      setIsViewportPanning(false);
    }
  }, []);

  const handleViewportWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    if (!previewRef.current) {
      return;
    }
    event.preventDefault();
    const rect = previewRef.current.getBoundingClientRect();
    const cursorX = event.clientX - rect.left - rect.width / 2;
    const cursorY = event.clientY - rect.top - rect.height / 2;
    updateViewport((prev) => {
      const scaleFactor = Math.exp(-event.deltaY * 0.0015);
      const nextScale = Math.min(6, Math.max(0.4, prev.scale * scaleFactor));
      const appliedFactor = nextScale / prev.scale;
      return {
        scale: nextScale,
        offset: {
          x: (prev.offset.x + cursorX) * appliedFactor - cursorX,
          y: (prev.offset.y + cursorY) * appliedFactor - cursorY,
        },
      };
    });
  }, [updateViewport]);

  const handleResetViewport = useCallback(() => {
    updateViewport(createDefaultViewport());
  }, [updateViewport]);

  const isViewportDefault = useMemo(
    () =>
      Math.abs(viewportState.scale - 1) < 0.0001 &&
      Math.abs(viewportState.offset.x) < 0.5 &&
      Math.abs(viewportState.offset.y) < 0.5,
    [viewportState]
  );

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.style.transform = `translate3d(${viewportState.offset.x}px, ${viewportState.offset.y}px, 0) scale(${viewportState.scale})`;
    }
  }, [viewportState]);

  const canvasClassName = isDragging
    ? 'report-create__canvas report-create__canvas--dragging'
    : 'report-create__canvas';

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
                }`}
                onPointerDown={handleViewportPointerDown}
                onPointerMove={handleViewportPointerMove}
                onPointerUp={releaseViewportPointer}
                onPointerLeave={releaseViewportPointer}
                onPointerCancel={releaseViewportPointer}
                onWheel={handleViewportWheel}
              >
                <img
                  src={selectedImage.url}
                  alt={selectedImage.name}
                  style={{
                    transform: `translate3d(${viewportState.offset.x}px, ${viewportState.offset.y}px, 0) scale(${viewportState.scale})`,
                  }}
                />
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
                      <img
                        src={image.url}
                        alt={image.name}
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

