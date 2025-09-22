import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, MutableRefObject } from 'react';

import { createId } from '../utils/createId';
import type { WorkspaceImage } from '../types';

export type UseImageLibraryResult = {
  images: WorkspaceImage[];
  selectedId: string | null;
  selectedImage: WorkspaceImage | null;
  setSelectedId: (id: string | null) => void;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  isDragging: boolean;
  addFiles: (files: FileList | File[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
  handleFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleChooseClick: () => void;
  handleDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  handleDrop: (event: DragEvent<HTMLDivElement>) => void;
};

export function useImageLibrary(): UseImageLibraryResult {
  const [images, setImages] = useState<WorkspaceImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef(new Map<string, string>());
  const dragCounterRef = useRef(0);

  const selectedImage = useMemo(() => {
    if (!images.length) return null;
    return images.find((img) => img.id === selectedId) ?? images[0];
  }, [images, selectedId]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const additions = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (!additions.length) return;

    const next = additions.map<WorkspaceImage>((file) => {
      const id = createId();
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.set(id, url);
      return { id, name: file.name, url, file };
    });

    setImages((prev) => [...prev, ...next]);
    setSelectedId((prev) => prev ?? next[0]?.id ?? null);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const existing = prev.find((img) => img.id === id);
      if (!existing) return prev;

      URL.revokeObjectURL(existing.url);
      objectUrlsRef.current.delete(id);

      const remaining = prev.filter((img) => img.id !== id);
      if (!remaining.length) {
        setSelectedId(null);
      } else if (id === selectedId) {
        setSelectedId(remaining[0].id);
      }
      return remaining;
    });
  }, [selectedId]);

  const clearImages = useCallback(() => {
    setImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.url));
      objectUrlsRef.current.clear();
      return [];
    });
    setSelectedId(null);
  }, []);

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) addFiles(event.target.files);
      event.target.value = '';
    },
    [addFiles]
  );

  const handleChooseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      if (event.dataTransfer.files.length > 0) {
        addFiles(event.dataTransfer.files);
      }
    },
    [addFiles]
  );

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  return {
    images,
    selectedId,
    selectedImage,
    setSelectedId,
    fileInputRef,
    isDragging,
    addFiles,
    removeImage,
    clearImages,
    handleFileInputChange,
    handleChooseClick,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  };
}
