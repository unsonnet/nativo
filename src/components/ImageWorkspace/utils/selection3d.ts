import type { SelectionState } from './drawSelection';
import type { Metrics } from './drawSelection';
import { quatRotateVec3, quatIdentity, type Quat } from './math3d';

export type RotatedQuad = {
  corners2D: { x: number; y: number }[]; // 4 projected corners in overlay CSS px (LT, RT, RB, LB)
  corners3D: { x: number; y: number; z: number }[]; // original 3D corners after rotation
  center: { x: number; y: number };
};

export function computeSelectionBaseRect(metrics: Metrics | null, selection: SelectionState | null) {
  if (!metrics || !selection) return null;
  const sel = selection.sel;
  if (!sel || !sel.length || !sel.width) return null;

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

  // center in image content
  let x = metrics.left + (baseW - w) / 2;
  let y = metrics.top + (baseH - h) / 2;

  // apply scale about center, then offset
  const cx = x + w / 2;
  const cy = y + h / 2;
  w = w * (selection.scale ?? 1);
  h = h * (selection.scale ?? 1);
  x = cx - w / 2 + (selection.offset?.x ?? 0);
  y = cy - h / 2 + (selection.offset?.y ?? 0);

  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

// Project a 3D point to 2D screen (overlay CSS px) using a simple orthographic + faux perspective factor.
export function projectTo2D(v: { x: number; y: number; z: number }, center: { x: number; y: number }, persp = 800) {
  // simple perspective scale: s = persp / (persp - z)
  const s = persp / (persp - v.z);
  return { x: center.x + v.x * s, y: center.y + v.y * s };
}

export function buildRotatedQuad(metrics: Metrics, selection: SelectionState, rot?: Quat | null, persp = 800): RotatedQuad | null {
  const base = computeSelectionBaseRect(metrics, selection);
  if (!base) return null;
  const q = rot ?? (selection && selection.rotation ? (selection.rotation as Quat) : quatIdentity());

  // local half extents
  const hx = base.w / 2;
  const hy = base.h / 2;

  // define corners in local 3D space around origin (0,0,0)
  const corners: { x: number; y: number; z: number }[] = [
    { x: -hx, y: -hy, z: 0 },
    { x: +hx, y: -hy, z: 0 },
    { x: +hx, y: +hy, z: 0 },
    { x: -hx, y: +hy, z: 0 },
  ];

  const rot3D = corners.map((c) => quatRotateVec3(q, c));
  const proj = rot3D.map((c) => projectTo2D(c, { x: base.cx, y: base.cy }, persp));

  return { corners2D: proj, corners3D: rot3D, center: { x: base.cx, y: base.cy } };
}
