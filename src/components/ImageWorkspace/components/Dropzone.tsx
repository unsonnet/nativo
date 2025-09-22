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
      className={`report-create__dropzone${isDragging ? ' report-create__dropzone--active' : ''}`}
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Upload className="report-create__dropzone-icon" strokeWidth={1.8} />
      <p className="report-create__dropzone-text">Drag and drop images here</p>
      <span className="report-create__dropzone-separator">or</span>
      <button type="button" className="report-create__choose" onClick={onChooseClick}>
        <span aria-hidden className="report-create__choose-icon">+</span>
        Choose Images
      </button>
    </div>
  );
}
