'use client';

import Image from 'next/image';
import type { WorkspaceImage } from '../../types';

export type ThumbnailItemProps = {
  image: WorkspaceImage;
  active: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
};

/**
 * Renders one thumbnail with select and remove controls.
 */
export function ThumbnailItem({ image, active, onSelect, onRemove }: ThumbnailItemProps) {
  return (
    <div className={`image-workspace__thumb${active ? ' image-workspace__thumb--active' : ''}`} role="listitem">
      <button
        type="button"
        className="image-workspace__thumb-select"
        onClick={() => onSelect(image.id)}
        onKeyDown={(e) => e.key === 'Delete' && (e.preventDefault(), onRemove(image.id))}
      >
        <Image src={image.url} alt={image.name} width={64} height={64} unoptimized className="image-workspace__thumb-image" />
      </button>
      <button
        type="button"
        className="image-workspace__thumb-remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(image.id);
        }}
        aria-label={`Remove ${image.name}`}
      >
        ×
      </button>
    </div>
  );
}
