import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';

/* ------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------*/
export type MaskTool = 'erase' | 'restore';

export type MaskImage = { id: string; url: string };

type ImageAsset = {
  image: HTMLImageElement;
  width: number;
  height: number;
  mask: HTMLCanvasElement;
  maskCtx: CanvasRenderingContext2D;
  tint: HTMLCanvasElement;
  tintCtx: CanvasRenderingContext2D;
};

export type BooleanMask = { width: number; height: number; data: Uint8Array };

type LassoPoint = { x: number; y: number };

type LassoState = {
  pointerId: number;
  tool: MaskTool;
  imageId: string;
  points: LassoPoint[];
  previewPoints: LassoPoint[];
  lastInsertTime: number;
};

export type UseImageMaskingParams<TImage extends MaskImage> = {
  images: TImage[];
  selectedImageId: string | null;
  previewRef: MutableRefObject<HTMLDivElement | null>;
  imageRef: MutableRefObject<HTMLImageElement | null>;
  onToggleViewportPanning: (isPanning: boolean) => void;
};

export type UseImageMaskingResult = {
  isMaskTool: (tool: string) => tool is MaskTool;
  handlePointerDown: (e: ReactPointerEvent<HTMLDivElement>, tool: string) => boolean;
  handlePointerMove: (e: ReactPointerEvent<HTMLDivElement>) => boolean;
  handlePointerUp: (e: ReactPointerEvent<HTMLDivElement>) => boolean;
  handleToolChange: () => void;
  lassoPreview: { tool: MaskTool; points: LassoPoint[] } | null;
  overlayVersion: number;
  getTintOverlay: (id?: string) => HTMLCanvasElement | null;
  getMaskCanvas: (id?: string) => HTMLCanvasElement | null;
  getBooleanMask: (id?: string) => BooleanMask | null;
};

/* ------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------*/
const LASSO_DISTANCE_THRESHOLD_SQ = 1; // Min distance² before recording a new point
const LASSO_TIME_THRESHOLD_MS = 45; // Max interval before forcing a new point
const MASK_TOOLS: readonly MaskTool[] = ['erase', 'restore'];

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* ------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------*/
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

  /* ---------------- Helpers ---------------- */

  const isMaskTool = useCallback(
    (tool: string): tool is MaskTool => MASK_TOOLS.includes(tool as MaskTool),
    []
  );

  /** Convert pointer coords to image coords */
  const getImageCoords = useCallback(
    (e: ReactPointerEvent, imageId: string) => {
      const img = imageRef.current;
      const asset = assetsRef.current.get(imageId);
      if (!img || !asset?.width || !asset?.height) return null;

      const rect = img.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;

      return {
        x: Math.max(0, Math.min(asset.width, ((e.clientX - rect.left) / rect.width) * asset.width)),
        y: Math.max(0, Math.min(asset.height, ((e.clientY - rect.top) / rect.height) * asset.height)),
      };
    },
    [imageRef]
  );

  /** Convert pointer coords to preview coords */
  const getPreviewCoords = useCallback(
    (e: ReactPointerEvent) => {
      const rect = previewRef.current?.getBoundingClientRect();
      return rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : null;
    },
    [previewRef]
  );

  /** Refresh tint overlay from mask */
  const updateTintOverlay = useCallback((asset: ImageAsset) => {
    const { tintCtx, width, height, mask } = asset;
    if (!tintCtx || !width || !height) return;

    tintCtx.save();
    tintCtx.clearRect(0, 0, width, height);
    tintCtx.fillStyle = '#fff';
    tintCtx.fillRect(0, 0, width, height);
    tintCtx.globalCompositeOperation = 'destination-out';
    tintCtx.drawImage(mask, 0, 0);
    tintCtx.restore();
  }, []);

  /** Apply polygon mask (lasso) */
  const applyLassoMask = useCallback(
    (imageId: string, tool: MaskTool, points: LassoPoint[]) => {
      if (points.length < 3) return;

      const asset = assetsRef.current.get(imageId);
      if (!asset) return;

      const { maskCtx } = asset;
      maskCtx.save();
      maskCtx.beginPath();
      maskCtx.moveTo(points[0].x, points[0].y);
      points.forEach((p, i) => i && maskCtx.lineTo(p.x, p.y));
      maskCtx.closePath();
      maskCtx.globalCompositeOperation = tool === 'erase' ? 'destination-out' : 'source-over';
      maskCtx.fillStyle = tool === 'erase' ? '#000' : '#fff';
      maskCtx.fill();
      maskCtx.restore();

      updateTintOverlay(asset);
      setOverlayVersion((v) => v + 1);
    },
    [updateTintOverlay]
  );

  /** Release pointer capture + reset state */
  const releaseLasso = useCallback(() => {
    const s = lassoStateRef.current;
    if (!s) return;

    previewRef.current?.releasePointerCapture(s.pointerId);
    lassoStateRef.current = null;
    setLassoPreview(null);
    onToggleViewportPanning(false);
  }, [onToggleViewportPanning, previewRef]);

  /* ---------------- Handlers ---------------- */

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, tool: string) => {
      if (!isMaskTool(tool) || e.button !== 0 || !selectedImageId) return false;

      const point = getImageCoords(e, selectedImageId);
      const previewPoint = getPreviewCoords(e);
      if (!point || !previewPoint) return false;

      previewRef.current?.setPointerCapture(e.pointerId);
      lassoStateRef.current = {
        pointerId: e.pointerId,
        tool,
        imageId: selectedImageId,
        points: [point],
        previewPoints: [previewPoint],
        lastInsertTime: now(),
      };
      onToggleViewportPanning(false);
      setLassoPreview({ tool, points: [previewPoint] });
      return true;
    },
    [getImageCoords, getPreviewCoords, isMaskTool, onToggleViewportPanning, previewRef, selectedImageId]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = lassoStateRef.current;
      if (!s || s.pointerId !== e.pointerId) return false;

      e.preventDefault();
      const p = getImageCoords(e, s.imageId);
      const pp = getPreviewCoords(e);
      if (!p || !pp) return true;

      const last = s.points[s.points.length - 1];
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      const distSq = dx * dx + dy * dy;
      const elapsed = now() - s.lastInsertTime;

      if (distSq >= LASSO_DISTANCE_THRESHOLD_SQ || elapsed >= LASSO_TIME_THRESHOLD_MS) {
        s.points.push(p);
        s.previewPoints.push(pp);
        s.lastInsertTime = now();
        setLassoPreview({ tool: s.tool, points: [...s.previewPoints] });
      }
      return true;
    },
    [getImageCoords, getPreviewCoords]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = lassoStateRef.current;
      if (!s || s.pointerId !== e.pointerId) return false;

      applyLassoMask(s.imageId, s.tool, s.points);
      releaseLasso();
      return true;
    },
    [applyLassoMask, releaseLasso]
  );

  const handleToolChange = useCallback(() => {
    releaseLasso();
    setOverlayVersion((v) => v + 1);
  }, [releaseLasso]);

  /* ---------------- Asset lifecycle ---------------- */

  useEffect(() => {
    const selected = selectedImageId ? images.find((img) => img.id === selectedImageId) : null;
    if (!selected) return;

    const asset = assetsRef.current.get(selected.id);
    if (asset) return;

    const image = new Image();
    image.src = selected.url;
    image.crossOrigin = 'anonymous';

    const handleLoad = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (!width || !height) return;

      const mask = document.createElement('canvas');
      mask.width = width;
      mask.height = height;
      const maskCtx = mask.getContext('2d');

      const tint = document.createElement('canvas');
      tint.width = width;
      tint.height = height;
      const tintCtx = tint.getContext('2d');

      if (!maskCtx || !tintCtx) return;

      maskCtx.fillStyle = '#fff';
      maskCtx.fillRect(0, 0, width, height);

      assetsRef.current.set(selected.id, { image, width, height, mask, maskCtx, tint, tintCtx });
      updateTintOverlay({ image, width, height, mask, maskCtx, tint, tintCtx });
      setOverlayVersion((v) => v + 1);
    };

    image.addEventListener('load', handleLoad);
    return () => image.removeEventListener('load', handleLoad);
  }, [images, selectedImageId, updateTintOverlay]);

  useEffect(() => () => releaseLasso(), [releaseLasso]);

  /* ---------------- Derived getters ---------------- */

  const getTintOverlay = useCallback(
    (id?: string) => {
      const key = id ?? selectedImageId;
      return key ? assetsRef.current.get(key)?.tint ?? null : null;
    },
    [selectedImageId]
  );

  const getMaskCanvas = useCallback(
    (id?: string) => {
      const key = id ?? selectedImageId;
      return key ? assetsRef.current.get(key)?.mask ?? null : null;
    },
    [selectedImageId]
  );

  const getBooleanMask = useCallback(
    (id?: string) => {
      const key = id ?? selectedImageId;
      if (!key) return null;

      const mask = assetsRef.current.get(key)?.mask;
      if (!mask) return null;

      const ctx = mask.getContext('2d');
      if (!ctx) return null;

      const { width, height } = mask;
      const { data } = ctx.getImageData(0, 0, width, height);
      const boolMask = new Uint8Array(width * height);

      for (let i = 0; i < data.length; i += 4) {
        boolMask[i / 4] = data[i + 3] > 0 ? 1 : 0;
      }

      return { width, height, data: boolMask } satisfies BooleanMask;
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
    getMaskCanvas,
    getBooleanMask,
  };
}
