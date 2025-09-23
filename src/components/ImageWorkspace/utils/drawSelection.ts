export type Metrics = {
  left: number;
  top: number;
  width: number;
  height: number;
  containerWidth: number;
  containerHeight: number;
};

export type Selection = { length: number | null; width: number | null; thickness: number | null } | null;

export function drawSelection(ctx: CanvasRenderingContext2D, metrics: Metrics, sel: Selection) {
  if (!sel || !sel.length || !sel.width) return;

  // compute aspect ratio with longest horizontal
  const long = Math.max(sel.length, sel.width);
  const short = Math.min(sel.length, sel.width);
  const aspect = long / short;

  // size relative to image content (CSS px)
  const baseW = metrics.width;
  const baseH = metrics.height;
  const maxBase = Math.min(baseW, baseH) * 0.22;

  let h = maxBase;
  let w = aspect * h;
  if (w > baseW) {
    w = baseW * 0.9;
    h = w / aspect;
  }
  if (h > baseH) {
    h = baseH * 0.9;
    w = h * aspect;
  }

  const x = metrics.left + (baseW - w) / 2;
  const y = metrics.top + (baseH - h) / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(56,189,248,0.08)';
  ctx.strokeStyle = 'rgba(56,189,248,0.9)';
  ctx.lineWidth = 2;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.strokeRect(Math.round(x) + 1, Math.round(y) + 1, Math.round(w) - 2, Math.round(h) - 2);
  ctx.restore();
}
