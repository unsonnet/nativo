'use client';

import { Upload } from 'lucide-react';
import type { DragEventHandler } from 'react';

type DropzoneProps = {
  isDragging: boolean;
  onChooseClick: () => void;
  onDragEnter: DragEventHandler<HTMLDivElement>;
  onDragLeave: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
};

export function Dropzone({
  isDragging,
  onChooseClick,
  onDragEnter,
  onDragLeave,
  onDrop,
}: DropzoneProps) {
  return (
    <div
      className={`image-workspace__dropzone${isDragging ? ' image-workspace__dropzone--active' : ''}`}
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Upload className="image-workspace__dropzone-icon" strokeWidth={1.8} />
      <p className="image-workspace__dropzone-text">Drag and drop images here</p>
      <span className="image-workspace__dropzone-separator">or</span>
      <button type="button" className="image-workspace__choose" onClick={onChooseClick}>
        <span aria-hidden className="image-workspace__choose-icon">+</span>
        Choose Images
      </button>
    </div>
  );
}
