import { buildRotatedQuad } from './selection3d';
export type Metrics = {
  left: number;
  top: number;
  width: number;
  height: number;
  containerWidth: number;
  containerHeight: number;
};

export type SelectionVals = { length: number | null; width: number | null; thickness: number | null } | null;

// SelectionState contains the raw selection values plus transform (offset/scale)
export type SelectionState =
  | {
      sel: SelectionVals;
      offset: { x: number; y: number };
      scale: number;
      rotation?: { x: number; y: number; z: number; w: number } | null;
    }
  | null;

export function drawSelection(ctx: CanvasRenderingContext2D, metrics: Metrics, selection: SelectionState) {
  if (!selection) return;
  const sel = selection.sel;
  if (!sel || !sel.length || !sel.width) return;

  // If rotation is present, draw as rotated quad in pseudo-3D
  const hasRotation = !!(selection as any).rotation;
  if (hasRotation) {
    const quad = buildRotatedQuad(metrics as any, selection as any);
    if (quad) {
      const pts = quad.corners2D;
      ctx.save();
      ctx.strokeStyle = 'rgba(56,189,248,0.9)';
      ctx.fillStyle = 'rgba(56,189,248,0.08)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.round(pts[0].x), Math.round(pts[0].y));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(Math.round(pts[i].x), Math.round(pts[i].y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }
  }

  // Axis-aligned rendering fallback
  const long = Math.max(sel.length, sel.width);
  const short = Math.min(sel.length, sel.width);
  const aspect = long / short;
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
  let x = metrics.left + (baseW - w) / 2;
  let y = metrics.top + (baseH - h) / 2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  w = w * (selection.scale ?? 1);
  h = h * (selection.scale ?? 1);
  x = cx - w / 2 + (selection.offset?.x ?? 0);
  y = cy - h / 2 + (selection.offset?.y ?? 0);
  ctx.save();
  ctx.fillStyle = 'rgba(56,189,248,0.08)';
  ctx.strokeStyle = 'rgba(56,189,248,0.9)';
  ctx.lineWidth = 2;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.strokeRect(Math.round(x) + 1, Math.round(y) + 1, Math.round(w) - 2, Math.round(h) - 2);
  ctx.restore();
}
