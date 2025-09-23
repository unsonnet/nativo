'use client';

export type LassoOverlayProps = {
  lassoData: {
    path: string;
    closed: string | null;
    stroke: string;
    fill: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null;
  width: number;
  height: number;
};

/**
 * SVG overlay that renders lasso path, fill, and start/end points.
 */
export function LassoOverlay({ lassoData, width, height }: LassoOverlayProps) {
  if (!lassoData || width <= 0 || height <= 0) return null;
  return (
    <svg className="image-workspace__lasso-overlay" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {lassoData.closed && <path d={lassoData.closed} className="image-workspace__lasso-fill" fill={lassoData.fill} />}
      <path
        d={lassoData.path}
        className="image-workspace__lasso-path"
        stroke={lassoData.stroke}
        strokeWidth={2}
        strokeDasharray="6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle
        className="image-workspace__lasso-point"
        cx={lassoData.start.x}
        cy={lassoData.start.y}
        r={4}
        stroke={lassoData.stroke}
        strokeWidth={2}
        fill="#0f172a"
      />
      <circle className="image-workspace__lasso-point" cx={lassoData.end.x} cy={lassoData.end.y} r={3} fill={lassoData.stroke} />
    </svg>
  );
}
