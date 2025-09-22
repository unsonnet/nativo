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

const createDefaultViewport = (): ViewportState => ({
  scale: 1,
  offset: { x: 0, y: 0 },
});

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
};

type UseViewportTransformResult = {
  viewportState: ViewportState;
  viewportRef: MutableRefObject<ViewportState>;
  isViewportDefault: boolean;
  handlePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => boolean;
  handlePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => boolean;
  handlePointerUp: (event: ReactPointerEvent<HTMLDivElement>) => boolean;
  handleWheel: (event: ReactWheelEvent<HTMLDivElement>) => void;
  resetViewport: () => void;
  cancelPan: () => void;
};

export function useViewportTransform({
  imageRef,
  previewRef,
  onPanningChange,
}: UseViewportTransformParams): UseViewportTransformResult {
  const [viewportState, setViewportState] = useState<ViewportState>(createDefaultViewport);
  const viewportRef = useRef<ViewportState>(viewportState);
  const pointerStateRef = useRef<PointerState | null>(null);
  const rafRef = useRef<number | null>(null);

  const scheduleRender = useCallback(() => {
    if (rafRef.current !== null) {
      return;
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setViewportState({
        scale: viewportRef.current.scale,
        offset: { ...viewportRef.current.offset },
      });
    });
  }, []);

  const applyViewport = useCallback(
    (next: ViewportState) => {
      viewportRef.current = {
        scale: next.scale,
        offset: { x: next.offset.x, y: next.offset.y },
      };
      const target = imageRef.current;
      if (target) {
        target.style.transform = `translate3d(${viewportRef.current.offset.x}px, ${viewportRef.current.offset.y}px, 0) scale(${viewportRef.current.scale})`;
      }
      scheduleRender();
    },
    [imageRef, scheduleRender]
  );

  const updateViewport = useCallback(
    (
      updater: ViewportState | ((prev: ViewportState) => ViewportState)
    ) => {
      const next =
        typeof updater === 'function'
          ? (updater as (prev: ViewportState) => ViewportState)(viewportRef.current)
          : updater;
      applyViewport(next);
    },
    [applyViewport]
  );

  const cancelPan = useCallback(() => {
    const state = pointerStateRef.current;
    pointerStateRef.current = null;
    if (state && previewRef.current?.hasPointerCapture(state.pointerId)) {
      previewRef.current.releasePointerCapture(state.pointerId);
    }
    onPanningChange?.(false);
  }, [onPanningChange, previewRef]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return false;
      }
      const preview = previewRef.current;
      if (!preview) {
        return false;
      }

      event.preventDefault();
      preview.setPointerCapture(event.pointerId);
      pointerStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffset: { ...viewportRef.current.offset },
      };
      onPanningChange?.(true);
      return true;
    },
    [onPanningChange, previewRef]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const pointerState = pointerStateRef.current;
      if (!pointerState || pointerState.pointerId !== event.pointerId) {
        return false;
      }

      event.preventDefault();
      const dx = event.clientX - pointerState.startX;
      const dy = event.clientY - pointerState.startY;
      updateViewport({
        scale: viewportRef.current.scale,
        offset: {
          x: pointerState.startOffset.x + dx,
          y: pointerState.startOffset.y + dy,
        },
      });
      return true;
    },
    [updateViewport]
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const pointerState = pointerStateRef.current;
      if (!pointerState || pointerState.pointerId !== event.pointerId) {
        return false;
      }

      cancelPan();
      return true;
    },
    [cancelPan]
  );

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      const preview = previewRef.current;
      if (!preview) {
        return;
      }
      event.preventDefault();
      const rect = preview.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      updateViewport((prev) => {
        const scaleFactor = Math.exp(-event.deltaY * 0.0015);
        const nextScale = Math.min(6, Math.max(0.4, prev.scale * scaleFactor));
        if (nextScale === prev.scale) {
          return prev;
        }
        const appliedFactor = nextScale / prev.scale;
        const nextOffsetX = localX - appliedFactor * (localX - prev.offset.x);
        const nextOffsetY = localY - appliedFactor * (localY - prev.offset.y);
        return {
          scale: nextScale,
          offset: {
            x: nextOffsetX,
            y: nextOffsetY,
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
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      cancelPan();
    },
    [cancelPan]
  );

  const isViewportDefault = useMemo(
    () =>
      Math.abs(viewportState.scale - 1) < 0.0001 &&
      Math.abs(viewportState.offset.x) < 0.5 &&
      Math.abs(viewportState.offset.y) < 0.5,
    [viewportState]
  );

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

export { createDefaultViewport };

