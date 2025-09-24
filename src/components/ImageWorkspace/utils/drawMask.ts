import type { Metrics } from './drawSelection';
import { createStripesPattern } from './patterns';

export function drawMask(ctx: CanvasRenderingContext2D, metrics: Metrics, tint: HTMLCanvasElement | null, img?: HTMLImageElement | null, maskVisible = true) {
  if (!ctx) return;
  ctx.save();
  if (maskVisible) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, metrics.containerWidth, metrics.containerHeight);

  const stripes = createStripesPattern();
    if (stripes) {
      const pattern = ctx.createPattern(stripes, 'repeat');
      if (pattern) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, metrics.containerWidth, metrics.containerHeight);
        ctx.globalAlpha = 1;
      }
    }

    ctx.globalCompositeOperation = 'destination-in';
    const dstLeft = Math.round(metrics.left);
    const dstTop = Math.round(metrics.top);
    const dstWidth = Math.round(metrics.width);
    const dstHeight = Math.round(metrics.height);
    if (tint && tint.width && tint.height) {
      ctx.drawImage(tint, 0, 0, tint.width, tint.height, dstLeft, dstTop, dstWidth, dstHeight);
    }
  } else {
    if (img) {
      const dstLeft = Math.round(metrics.left);
      const dstTop = Math.round(metrics.top);
      const dstWidth = Math.round(metrics.width);
      const dstHeight = Math.round(metrics.height);
      try {
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dstLeft, dstTop, dstWidth, dstHeight);
        if (tint && tint.width && tint.height) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.drawImage(tint, 0, 0, tint.width, tint.height, dstLeft, dstTop, dstWidth, dstHeight);
          ctx.globalCompositeOperation = 'source-over';
        }
      } catch {
        // ignore
      }
    }
  }
  ctx.restore();
}
