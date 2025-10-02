'use client';

import { ThumbnailItem } from './ThumbnailItem';
import type { WorkspaceImage } from '../../types';

export type ThumbnailListProps = {
  images: WorkspaceImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  isReportSubmitting?: boolean;
};

/**
 * Renders a row of thumbnails plus an "add" button.
 */
export function ThumbnailList({ images, selectedId, onSelect, onRemove, onAdd, isReportSubmitting = false }: ThumbnailListProps) {
  return (
    <ul className="image-workspace__thumbs" role="list">
      {images.map((img) => (
        <li key={img.id}>
          <ThumbnailItem image={img} active={img.id === selectedId} onSelect={onSelect} onRemove={onRemove} />
        </li>
      ))}
      <li>
        <button 
          type="button" 
          className={`image-workspace__thumb image-workspace__thumb--add${isReportSubmitting ? ' image-workspace__thumb--disabled' : ''}`} 
          onClick={isReportSubmitting ? undefined : onAdd} 
          disabled={isReportSubmitting}
          aria-label={isReportSubmitting ? 'Adding images disabled during report creation' : 'Add new image'}
        >
          <span aria-hidden className="image-workspace__thumb-add">+</span>
        </button>
      </li>
    </ul>
  );
}
