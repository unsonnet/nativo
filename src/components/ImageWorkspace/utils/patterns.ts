export function createStripesPattern() {
  const canvas = document.createElement('canvas');
  const size = 30;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-size * 0.5, size);
  ctx.lineTo(size, -size * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, size * 1.5);
  ctx.lineTo(size * 1.5, 0);
  ctx.stroke();
  return canvas;
}
