import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';

/* ------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------*/
const LASSO_DISTANCE_THRESHOLD_SQ = 1;     // Min distance² before recording a new point
const LASSO_TIME_THRESHOLD_MS = 45;        // Max interval before forcing a new point
const MASK_TOOLS = ['erase', 'restore'] as const;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* ------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------*/
type MaskTool = (typeof MASK_TOOLS)[number];

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

type LassoState = {
  pointerId: number;
  tool: MaskTool;
  imageId: string;
  points: { x: number; y: number }[];
  previewPoints: { x: number; y: number }[];
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
  lassoPreview: { tool: MaskTool; points: { x: number; y: number }[] } | null;
  overlayVersion: number;
  getTintOverlay: (id?: string) => HTMLCanvasElement | null;
  getMaskCanvas: (id?: string) => HTMLCanvasElement | null;
  getBooleanMask: (id?: string) => BooleanMask | null;
};

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

  const [lassoPreview, setLassoPreview] =
    useState<UseImageMaskingResult['lassoPreview']>(null);
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
    (imageId: string, tool: MaskTool, points: { x: number; y: number }[]) => {
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
      const t = now();

      if (distSq >= LASSO_DISTANCE_THRESHOLD_SQ || t - s.lastInsertTime >= LASSO_TIME_THRESHOLD_MS) {
        s.points.push(p);
        s.previewPoints.push(pp);
        s.lastInsertTime = t;
      } else {
        s.points[s.points.length - 1] = p;
        s.previewPoints[s.previewPoints.length - 1] = pp;
      }
      setLassoPreview({ tool: s.tool, points: [...s.previewPoints] });
      return true;
    },
    [getImageCoords, getPreviewCoords]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = lassoStateRef.current;
      if (!s || s.pointerId !== e.pointerId) return false;

      const cancelled = e.type === 'pointercancel';
      releaseLasso();

      if (!cancelled) {
        e.preventDefault();
        applyLassoMask(s.imageId, s.tool, s.points);
      }
      return true;
    },
    [applyLassoMask, releaseLasso]
  );

  const handleToolChange = useCallback(() => releaseLasso(), [releaseLasso]);

  /* ---------------- Lifecycle ---------------- */

  // Manage assets
  useEffect(() => {
    const assets = assetsRef.current;
    const activeIds = new Set(images.map((img) => img.id));

    // Drop removed images
    assets.forEach((_a, id) => !activeIds.has(id) && assets.delete(id));

    // Add new images
    images.forEach((img) => {
      if (assets.has(img.id)) return;

      const htmlImg = new Image();
      htmlImg.src = img.url;
      htmlImg.decoding = 'async';

      const mask = document.createElement('canvas');
      const tint = document.createElement('canvas');
      const maskCtx = mask.getContext('2d');
      const tintCtx = tint.getContext('2d');
      if (!maskCtx || !tintCtx) return;

      assets.set(img.id, { image: htmlImg, width: 0, height: 0, mask, maskCtx, tint, tintCtx });

      htmlImg.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = htmlImg;
        if (!w || !h) return;

        const a = assets.get(img.id);
        if (!a) return;

        Object.assign(a, { width: w, height: h });
        a.mask.width = a.tint.width = w;
        a.mask.height = a.tint.height = h;

        a.maskCtx.fillStyle = '#fff';
        a.maskCtx.fillRect(0, 0, w, h);

        updateTintOverlay(a);
        setOverlayVersion((v) => v + 1);
      };

      htmlImg.onerror = () => assets.delete(img.id);
    });
  }, [images, updateTintOverlay]);

  // Reset lasso on image/tool change
  useEffect(() => releaseLasso(), [releaseLasso, selectedImageId]);
  useEffect(() => () => releaseLasso(), [releaseLasso]);

  /* ---------------- Public API ---------------- */

  const getTintOverlay = useCallback(
    (id?: string) => assetsRef.current.get(id ?? selectedImageId ?? '')?.tint ?? null,
    [selectedImageId]
  );

  const getMaskCanvas = useCallback(
    (id?: string) => assetsRef.current.get(id ?? selectedImageId ?? '')?.mask ?? null,
    [selectedImageId]
  );

  const getBooleanMask = useCallback((id?: string) => {
    const asset = assetsRef.current.get(id ?? selectedImageId ?? '');
    if (!asset?.width || !asset?.height) return null;

    try {
      const { width, height } = asset;
      const { data } = asset.tintCtx.getImageData(0, 0, width, height);
      const boolData = new Uint8Array(width * height);
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        boolData[j] = data[i + 3] > 0 ? 1 : 0;
      }
      return { width, height, data: boolData };
    } catch (err) {
      console.error('Failed extracting boolean mask', id, err);
      return null;
    }
  }, [selectedImageId]);

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
