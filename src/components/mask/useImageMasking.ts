import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';

const LASSO_DISTANCE_THRESHOLD_SQ = 1;
const LASSO_TIME_THRESHOLD_MS = 45;
const getTimestamp = () =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

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
  tint: HTMLCanvasElement;
  tintCtx: CanvasRenderingContext2D | null;
};

type LassoState = {
  pointerId: number;
  tool: MaskTool;
  imageId: string;
  points: { x: number; y: number }[];
  previewPoints: { x: number; y: number }[];
  lastInsertTime: number;
};

type UseImageMaskingParams<TImage extends MaskImage> = {
  images: TImage[];
  selectedImageId: string | null;
  previewRef: MutableRefObject<HTMLDivElement | null>;
  imageRef: MutableRefObject<HTMLImageElement | null>;
  onToggleViewportPanning: (isPanning: boolean) => void;
};

type UseImageMaskingResult = {
  isMaskTool: (tool: string) => tool is MaskTool;
  handlePointerDown: (event: ReactPointerEvent<HTMLDivElement>, tool: string) => boolean;
  handlePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => boolean;
  handlePointerUp: (event: ReactPointerEvent<HTMLDivElement>) => boolean;
  handleToolChange: () => void;
  lassoPreview: {
    tool: MaskTool;
    points: { x: number; y: number }[];
  } | null;
  overlayVersion: number;
  getTintOverlay: (imageId?: string) => HTMLCanvasElement | null;
};

const MASK_TOOLS: MaskTool[] = ['erase', 'restore'];

export function useImageMasking<TImage extends MaskImage>({
  images,
  selectedImageId,
  previewRef,
  imageRef,
  onToggleViewportPanning,
}: UseImageMaskingParams<TImage>): UseImageMaskingResult {
  const assetsRef = useRef(new Map<string, ImageAsset>());
  const lassoStateRef = useRef<LassoState | null>(null);
  const [lassoPreview, setLassoPreview] = useState<UseImageMaskingResult['lassoPreview']>(null);
  const [overlayVersion, setOverlayVersion] = useState(0);

  const isMaskTool = useCallback((tool: string): tool is MaskTool => MASK_TOOLS.includes(tool as MaskTool), []);

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

      const imageRect = img.getBoundingClientRect();
      if (imageRect.width === 0 || imageRect.height === 0) {
        return null;
      }

      const localX = event.clientX - imageRect.left;
      const localY = event.clientY - imageRect.top;
      const imageX = localX / imageRect.width * asset.width;
      const imageY = localY / imageRect.height * asset.height;

      return {
        x: Math.max(0, Math.min(asset.width, imageX)),
        y: Math.max(0, Math.min(asset.height, imageY)),
      };
    },
    [imageRef, previewRef]
  );

  const getPreviewCoordinates = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const preview = previewRef.current;
      if (!preview) {
        return null;
      }
      const rect = preview.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    },
    [previewRef]
  );

  const updateTintOverlay = useCallback((asset: ImageAsset) => {
    if (!asset.tintCtx || asset.width === 0 || asset.height === 0) {
      return;
    }
    const ctx = asset.tintCtx;
    ctx.save();
    ctx.clearRect(0, 0, asset.width, asset.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, asset.width, asset.height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(asset.mask, 0, 0);
    ctx.restore();
  }, []);

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

      updateTintOverlay(asset);
      setOverlayVersion((prev) => prev + 1);
    },
    [updateTintOverlay]
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
    setLassoPreview(null);
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
      const previewPoint = getPreviewCoordinates(event);
      if (!point || !previewPoint) {
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
        previewPoints: [previewPoint],
        lastInsertTime: getTimestamp(),
      };
      onToggleViewportPanning(false);
      setLassoPreview({ tool, points: [previewPoint] });
      return true;
    },
    [getImageCoordinates, getPreviewCoordinates, isMaskTool, onToggleViewportPanning, previewRef, selectedImageId]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = lassoStateRef.current;
      if (!state || state.pointerId !== event.pointerId) {
        return false;
      }

      event.preventDefault();
      const point = getImageCoordinates(event, state.imageId);
      const previewPoint = getPreviewCoordinates(event);
      if (!point || !previewPoint) {
        return true;
      }

      const { points } = state;
      const previewPoints = state.previewPoints;
      if (points.length === 0) {
        points.push(point);
        previewPoints.push(previewPoint);
        state.lastInsertTime = getTimestamp();
      } else {
        const last = points[points.length - 1];
        const dx = point.x - last.x;
        const dy = point.y - last.y;
        const distanceSq = dx * dx + dy * dy;
        const now = getTimestamp();
        if (distanceSq >= LASSO_DISTANCE_THRESHOLD_SQ || now - state.lastInsertTime >= LASSO_TIME_THRESHOLD_MS) {
          points.push(point);
          previewPoints.push(previewPoint);
          state.lastInsertTime = now;
        } else {
          points[points.length - 1] = point;
          previewPoints[previewPoints.length - 1] = previewPoint;
        }
      }

      setLassoPreview({ tool: state.tool, points: [...state.previewPoints] });
      return true;
    },
    [getImageCoordinates, getPreviewCoordinates]
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
        const previewPoints = state.previewPoints.slice();
        const finalPoint = getImageCoordinates(event, imageId);
        const finalPreviewPoint = getPreviewCoordinates(event);
        if (finalPoint) {
          if (points.length === 0) {
            points.push(finalPoint);
            if (finalPreviewPoint) {
              previewPoints.push(finalPreviewPoint);
            }
          } else {
            const last = points[points.length - 1];
            const dx = finalPoint.x - last.x;
            const dy = finalPoint.y - last.y;
            if (dx * dx + dy * dy >= LASSO_DISTANCE_THRESHOLD_SQ) {
              points.push(finalPoint);
              if (finalPreviewPoint) {
                previewPoints.push(finalPreviewPoint);
              }
            } else {
              points[points.length - 1] = finalPoint;
              if (finalPreviewPoint) {
                previewPoints[previewPoints.length - 1] = finalPreviewPoint;
              }
            }
          }
        }

        setLassoPreview(null);
        applyLassoMask(imageId, tool, points);
      }

      return true;
    },
    [applyLassoMask, getImageCoordinates, getPreviewCoordinates, releaseLassoCapture]
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
      const initialMaskCtx = maskCanvas.getContext('2d');
      if (!initialMaskCtx) {
        return;
      }

      const tintCanvas = document.createElement('canvas');
      tintCanvas.width = 1;
      tintCanvas.height = 1;
      const initialTintCtx = tintCanvas.getContext('2d');
      if (!initialTintCtx) {
        return;
      }

      const baseAsset: ImageAsset = {
        image: htmlImage,
        width: 0,
        height: 0,
        mask: maskCanvas,
        maskCtx: initialMaskCtx,
        tint: tintCanvas,
        tintCtx: initialTintCtx,
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
        target.tint.width = naturalWidth;
        target.tint.height = naturalHeight;

        const maskContext = target.mask.getContext('2d');
        const tintContext = target.tint.getContext('2d');
        if (!maskContext || !tintContext) {
          return;
        }
        maskContext.fillStyle = '#fff';
        maskContext.fillRect(0, 0, naturalWidth, naturalHeight);

        const updatedAsset: ImageAsset = {
          ...target,
          width: naturalWidth,
          height: naturalHeight,
          maskCtx: maskContext,
          tintCtx: tintContext,
        };

        assetsRef.current.set(image.id, updatedAsset);
        updateTintOverlay(updatedAsset);
        setOverlayVersion((prev) => prev + 1);
      };

      htmlImage.onerror = () => {
        assets.delete(image.id);
      };
    });
  }, [images, selectedImageId, updateTintOverlay]);

  useEffect(() => {
    releaseLassoCapture();
  }, [releaseLassoCapture, selectedImageId]);

  useEffect(() => () => {
    releaseLassoCapture();
  }, [releaseLassoCapture]);

  const getTintOverlay = useCallback(
    (targetId?: string) => {
      const effectiveId = targetId ?? selectedImageId;
      if (!effectiveId) {
        return null;
      }
      const asset = assetsRef.current.get(effectiveId);
      return asset?.tint ?? null;
    },
    [selectedImageId]
  );

  return {
    isMaskTool,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleToolChange,
    lassoPreview,
    overlayVersion,
    getTintOverlay,
  };
}
