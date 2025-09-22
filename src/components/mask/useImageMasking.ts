import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';

const LASSO_DISTANCE_THRESHOLD_SQ = 9;

type MaskTool = 'erase' | 'restore';

type MaskImage = {
  id: string;
  url: string;
};

type ImageAsset = {
  image: HTMLImageElement;
  width: number;
  height: number;
  mask: HTMLCanvasElement;
  maskCtx: CanvasRenderingContext2D;
  maskUrl: string | null;
  maskDirty: boolean;
};

type LassoState = {
  pointerId: number;
  tool: MaskTool;
  imageId: string;
  points: { x: number; y: number }[];
};

type ViewportRef = MutableRefObject<{
  scale: number;
  offset: { x: number; y: number };
}>;

type UseImageMaskingParams<TImage extends MaskImage> = {
  images: TImage[];
  selectedImageId: string | null;
  previewRef: MutableRefObject<HTMLDivElement | null>;
  imageRef: MutableRefObject<HTMLImageElement | null>;
  viewportRef: ViewportRef;
  onToggleViewportPanning: (isPanning: boolean) => void;
};

type UseImageMaskingResult = {
  isMaskTool: (tool: string) => tool is MaskTool;
  handlePointerDown: (event: ReactPointerEvent<HTMLDivElement>, tool: string) => boolean;
  handlePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => boolean;
  handlePointerUp: (event: ReactPointerEvent<HTMLDivElement>) => boolean;
  handleToolChange: () => void;
};

const MASK_TOOLS: MaskTool[] = ['erase', 'restore'];

export function useImageMasking<TImage extends MaskImage>({
  images,
  selectedImageId,
  previewRef,
  imageRef,
  viewportRef,
  onToggleViewportPanning,
}: UseImageMaskingParams<TImage>): UseImageMaskingResult {
  const assetsRef = useRef(new Map<string, ImageAsset>());
  const lassoStateRef = useRef<LassoState | null>(null);

  const isMaskTool = useCallback((tool: string): tool is MaskTool => MASK_TOOLS.includes(tool as MaskTool), []);

  const applyMaskToImage = useCallback(
    (targetId?: string) => {
      const img = imageRef.current;
      if (!img) {
        return;
      }

      const effectiveId = targetId ?? selectedImageId;
      if (!effectiveId) {
        img.style.maskImage = 'none';
        img.style.webkitMaskImage = 'none';
        return;
      }

      const asset = assetsRef.current.get(effectiveId);
      if (!asset) {
        return;
      }

      if (asset.maskDirty || asset.maskUrl === null) {
        try {
          asset.maskUrl = asset.mask.toDataURL('image/png');
        } catch {
          asset.maskUrl = null;
        }
        asset.maskDirty = false;
      }

      if (effectiveId !== selectedImageId || !asset.maskUrl) {
        if (effectiveId === selectedImageId) {
          img.style.maskImage = 'none';
          img.style.webkitMaskImage = 'none';
        }
        return;
      }

      const urlValue = `url("${asset.maskUrl}")`;
      img.style.maskImage = urlValue;
      img.style.webkitMaskImage = urlValue;
      img.style.maskSize = '100% 100%';
      img.style.webkitMaskSize = '100% 100%';
      img.style.maskRepeat = 'no-repeat';
      img.style.webkitMaskRepeat = 'no-repeat';
      img.style.maskPosition = '0 0';
      img.style.webkitMaskPosition = '0 0';
    },
    [imageRef, selectedImageId]
  );

  const getImageCoordinates = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, imageId: string) => {
      const preview = previewRef.current;
      const img = imageRef.current;
      if (!preview || !img) {
        return null;
      }

      const asset = assetsRef.current.get(imageId);
      if (!asset || asset.width === 0 || asset.height === 0) {
        return null;
      }

      const rect = preview.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;

      const { offset, scale } = viewportRef.current;
      const normalizedX = (localX - offset.x) / scale;
      const normalizedY = (localY - offset.y) / scale;

      const layoutWidth = img.clientWidth;
      const layoutHeight = img.clientHeight;
      if (layoutWidth === 0 || layoutHeight === 0) {
        return null;
      }

      const scaledX = normalizedX * (asset.width / layoutWidth);
      const scaledY = normalizedY * (asset.height / layoutHeight);

      return {
        x: Math.max(0, Math.min(asset.width, scaledX)),
        y: Math.max(0, Math.min(asset.height, scaledY)),
      };
    },
    [imageRef, previewRef, viewportRef]
  );

  const applyLassoMask = useCallback(
    (imageId: string, tool: MaskTool, points: { x: number; y: number }[]) => {
      if (points.length < 3) {
        return;
      }

      const asset = assetsRef.current.get(imageId);
      if (!asset) {
        return;
      }

      const ctx = asset.maskCtx;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) {
        ctx.lineTo(points[index].x, points[index].y);
      }
      ctx.closePath();

      if (tool === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#fff';
      }
      ctx.fill();
      ctx.restore();

      asset.maskDirty = true;
      assetsRef.current.set(imageId, asset);
      applyMaskToImage(imageId);
    },
    [applyMaskToImage]
  );

  const releaseLassoCapture = useCallback(() => {
    const state = lassoStateRef.current;
    if (!state) {
      return;
    }
    const preview = previewRef.current;
    if (preview && preview.hasPointerCapture(state.pointerId)) {
      preview.releasePointerCapture(state.pointerId);
    }
    lassoStateRef.current = null;
    onToggleViewportPanning(false);
  }, [onToggleViewportPanning, previewRef]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, tool: string) => {
      if (!isMaskTool(tool) || event.button !== 0) {
        return false;
      }
      if (!selectedImageId) {
        return false;
      }

      const point = getImageCoordinates(event, selectedImageId);
      if (!point) {
        return false;
      }

      const preview = previewRef.current;
      if (!preview) {
        return false;
      }
      preview.setPointerCapture(event.pointerId);
      lassoStateRef.current = {
        pointerId: event.pointerId,
        tool,
        imageId: selectedImageId,
        points: [point],
      };
      onToggleViewportPanning(false);
      return true;
    },
    [getImageCoordinates, isMaskTool, onToggleViewportPanning, previewRef, selectedImageId]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = lassoStateRef.current;
      if (!state || state.pointerId !== event.pointerId) {
        return false;
      }

      event.preventDefault();
      const point = getImageCoordinates(event, state.imageId);
      if (!point) {
        return true;
      }

      const { points } = state;
      if (points.length === 0) {
        points.push(point);
      } else {
        const last = points[points.length - 1];
        const dx = point.x - last.x;
        const dy = point.y - last.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq >= LASSO_DISTANCE_THRESHOLD_SQ) {
          points.push(point);
        } else {
          points[points.length - 1] = point;
        }
      }

      return true;
    },
    [getImageCoordinates]
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = lassoStateRef.current;
      if (!state || state.pointerId !== event.pointerId) {
        return false;
      }

      const isCancel = event.type === 'pointercancel';
      releaseLassoCapture();

      if (!isCancel) {
        event.preventDefault();
        const { imageId, tool } = state;
        const points = state.points.slice();
        const finalPoint = getImageCoordinates(event, imageId);
        if (finalPoint) {
          if (points.length === 0) {
            points.push(finalPoint);
          } else {
            const last = points[points.length - 1];
            const dx = finalPoint.x - last.x;
            const dy = finalPoint.y - last.y;
            if (dx * dx + dy * dy >= LASSO_DISTANCE_THRESHOLD_SQ) {
              points.push(finalPoint);
            } else {
              points[points.length - 1] = finalPoint;
            }
          }
        }

        applyLassoMask(imageId, tool, points);
      }

      return true;
    },
    [applyLassoMask, getImageCoordinates, releaseLassoCapture]
  );

  const handleToolChange = useCallback(() => {
    releaseLassoCapture();
  }, [releaseLassoCapture]);

  useEffect(() => {
    const assets = assetsRef.current;
    const activeIds = new Set(images.map((image) => image.id));

    assets.forEach((_asset, id) => {
      if (!activeIds.has(id)) {
        assets.delete(id);
      }
    });

    images.forEach((image) => {
      if (assets.has(image.id)) {
        return;
      }

      const htmlImage = new Image();
      htmlImage.decoding = 'async';
      htmlImage.src = image.url;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = 1;
      maskCanvas.height = 1;
      const initialCtx = maskCanvas.getContext('2d');
      if (!initialCtx) {
        return;
      }

      const baseAsset: ImageAsset = {
        image: htmlImage,
        width: 0,
        height: 0,
        mask: maskCanvas,
        maskCtx: initialCtx,
        maskUrl: null,
        maskDirty: true,
      };

      assets.set(image.id, baseAsset);

      htmlImage.onload = () => {
        const target = assetsRef.current.get(image.id);
        if (!target) {
          return;
        }

        const { naturalWidth, naturalHeight } = htmlImage;
        if (naturalWidth === 0 || naturalHeight === 0) {
          return;
        }

        target.mask.width = naturalWidth;
        target.mask.height = naturalHeight;
        const context = target.mask.getContext('2d');
        if (!context) {
          return;
        }
        context.fillStyle = '#fff';
        context.fillRect(0, 0, naturalWidth, naturalHeight);

        assetsRef.current.set(image.id, {
          ...target,
          width: naturalWidth,
          height: naturalHeight,
          maskCtx: context,
          maskDirty: true,
        });

        if (image.id === selectedImageId) {
          applyMaskToImage(image.id);
        }
      };

      htmlImage.onerror = () => {
        assets.delete(image.id);
      };
    });
  }, [applyMaskToImage, images, selectedImageId]);

  useEffect(() => {
    applyMaskToImage();
  }, [applyMaskToImage, selectedImageId]);

  useEffect(() => {
    releaseLassoCapture();
  }, [releaseLassoCapture, selectedImageId]);

  useEffect(() => () => {
    releaseLassoCapture();
  }, [releaseLassoCapture]);

  return {
    isMaskTool,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleToolChange,
  };
}
