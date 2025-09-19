'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';

import { ImageToolbar } from '@/components/ImageToolbar';
import { NewReportForm } from '@/components/NewReportForm';

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

export default function NewReportPage() {
  const router = useRouter();
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef(new Map<string, string>());
  const dragCounter = useRef(0);
  const [activeTool, setActiveTool] = useState<'none' | 'zoom' | 'pan' | 'perspective' | 'erase'>('none');

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

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
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
    },
    []
  );

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

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files);
      event.dataTransfer.clearData();
    }
  };

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const canvasClassName = isDragging
    ? 'report-create__canvas report-create__canvas--dragging'
    : 'report-create__canvas';

  return (
    <div className="report-create">
      <aside className="report-create__sidebar">
        <button
          type="button"
          className="report-create__back"
          onClick={() => router.push('/dashboard')}
        >
          <span aria-hidden className="report-create__back-icon">←</span>
          Back to Reports
        </button>

        <div className="report-create__form">
          <NewReportForm />
        </div>
      </aside>

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
              onToolChange={(tool) => setActiveTool(tool as typeof activeTool)}
              onUndo={() => undefined}
              canUndo={false}
            />
            <div className="report-create__gallery">
              {selectedImage && (
                <figure className="report-create__preview">
                  <img src={selectedImage.url} alt={selectedImage.name} />
                </figure>
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
    </div>
  );
}
