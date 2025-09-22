'use client';

import Image from 'next/image';

import type { WorkspaceImage } from '../types';

type ThumbnailListProps = {
  images: WorkspaceImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
};

export function ThumbnailList({ images, selectedId, onSelect, onRemove, onAdd }: ThumbnailListProps) {
  return (
    <div className="image-workspace__thumbs" role="list">
      {images.map((image) => {
        const isActive = image.id === selectedId;
        return (
          <div
            key={image.id}
            className={`image-workspace__thumb${isActive ? ' image-workspace__thumb--active' : ''}`}
            role="listitem"
          >
            <button
              type="button"
              className="image-workspace__thumb-select"
              onClick={() => onSelect(image.id)}
              onKeyDown={(event) => {
                if (event.key === 'Delete') {
                  event.preventDefault();
                  onRemove(image.id);
                }
              }}
            >
              <Image
                src={image.url}
                alt={image.name}
                width={64}
                height={64}
                unoptimized
                className="image-workspace__thumb-image"
              />
            </button>
            <button
              type="button"
              className="image-workspace__thumb-remove"
              onClick={(event) => {
                event.stopPropagation();
                onRemove(image.id);
              }}
              aria-label={`Remove ${image.name}`}
            >
              ×
            </button>
          </div>
        );
      })}
      <button type="button" className="image-workspace__thumb image-workspace__thumb--add" onClick={onAdd}>
        <span aria-hidden className="image-workspace__thumb-add">+</span>
      </button>
    </div>
  );
}
