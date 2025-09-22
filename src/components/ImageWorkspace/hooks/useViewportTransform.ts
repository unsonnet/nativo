import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from 'react';

export type ViewportState = {
  scale: number;
  offset: { x: number; y: number };
};

type PointerState = {
  pointerId: number;
  startX: number;
  startY: number;
  startOffset: { x: number; y: number };
};

type UseViewportTransformParams = {
  imageRef: MutableRefObject<HTMLImageElement | null>;
  previewRef: MutableRefObject<HTMLDivElement | null>;
  onPanningChange?: (isPanning: boolean) => void;
  onViewportUpdate?: (state: ViewportState) => void;
};

type UseViewportTransformResult = {
  viewportState: ViewportState;
  viewportRef: MutableRefObject<ViewportState>;
  isViewportDefault: boolean;
  handlePointerDown: (e: ReactPointerEvent<HTMLDivElement>) => boolean;
  handlePointerMove: (e: ReactPointerEvent<HTMLDivElement>) => boolean;
  handlePointerUp: (e: ReactPointerEvent<HTMLDivElement>) => boolean;
  handleWheel: (e: ReactWheelEvent<HTMLDivElement>) => void;
  resetViewport: () => void;
  cancelPan: () => void;
};

export const createDefaultViewport = (): ViewportState => ({
  scale: 1,
  offset: { x: 0, y: 0 },
});

export function useViewportTransform({
  imageRef,
  previewRef,
  onPanningChange,
  onViewportUpdate,
}: UseViewportTransformParams): UseViewportTransformResult {
  const [viewportState, setViewportState] = useState<ViewportState>(createDefaultViewport);
  const viewportRef = useRef(viewportState);
  const pointerStateRef = useRef<PointerState | null>(null);
  const rafRef = useRef<number | null>(null);

  const scheduleRender = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setViewportState({ ...viewportRef.current });
    });
  }, []);

  const applyViewport = useCallback(
    (next: ViewportState) => {
      viewportRef.current = { scale: next.scale, offset: { ...next.offset } };

      const img = imageRef.current;
      if (img) {
        const { scale, offset } = viewportRef.current;
        img.style.transform = `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`;
      }

      onViewportUpdate?.({ ...viewportRef.current });
      scheduleRender();
    },
    [imageRef, onViewportUpdate, scheduleRender]
  );

  const updateViewport = useCallback(
    (updater: ViewportState | ((prev: ViewportState) => ViewportState)) => {
      const next =
        typeof updater === 'function'
          ? (updater as (prev: ViewportState) => ViewportState)(viewportRef.current)
          : updater;
      applyViewport(next);
    },
    [applyViewport]
  );

  const cancelPan = useCallback(() => {
    const s = pointerStateRef.current;
    pointerStateRef.current = null;

    if (s && previewRef.current?.hasPointerCapture(s.pointerId)) {
      previewRef.current.releasePointerCapture(s.pointerId);
    }
    onPanningChange?.(false);
  }, [onPanningChange, previewRef]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || !previewRef.current) return false;

      e.preventDefault();
      previewRef.current.setPointerCapture(e.pointerId);
      pointerStateRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startOffset: { ...viewportRef.current.offset },
      };
      onPanningChange?.(true);
      return true;
    },
    [onPanningChange, previewRef]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = pointerStateRef.current;
      if (!s || s.pointerId !== e.pointerId) return false;

      e.preventDefault();
      updateViewport({
        scale: viewportRef.current.scale,
        offset: {
          x: s.startOffset.x + (e.clientX - s.startX),
          y: s.startOffset.y + (e.clientY - s.startY),
        },
      });
      return true;
    },
    [updateViewport]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerStateRef.current?.pointerId !== e.pointerId) return false;
      cancelPan();
      return true;
    },
    [cancelPan]
  );

  const handleWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      const rect = previewRef.current?.getBoundingClientRect();
      if (!rect) return;

      e.preventDefault();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      updateViewport((prev) => {
        const scaleFactor = Math.exp(-e.deltaY * 0.0015);
        const nextScale = Math.min(6, Math.max(0.4, prev.scale * scaleFactor));
        if (nextScale === prev.scale) return prev;

        const applied = nextScale / prev.scale;
        return {
          scale: nextScale,
          offset: {
            x: localX - applied * (localX - prev.offset.x),
            y: localY - applied * (localY - prev.offset.y),
          },
        };
      });
    },
    [previewRef, updateViewport]
  );

  const resetViewport = useCallback(() => {
    cancelPan();
    applyViewport(createDefaultViewport());
  }, [applyViewport, cancelPan]);

  useEffect(() => {
    viewportRef.current = viewportState;
  }, [viewportState]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      cancelPan();
    },
    [cancelPan]
  );

  const isViewportDefault = useMemo(() => {
    const { scale, offset } = viewportState;
    return (
      Math.abs(scale - 1) < 0.0001 &&
      Math.abs(offset.x) < 0.5 &&
      Math.abs(offset.y) < 0.5
    );
  }, [viewportState]);

  return {
    viewportState,
    viewportRef,
    isViewportDefault,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    resetViewport,
    cancelPan,
  };
}
