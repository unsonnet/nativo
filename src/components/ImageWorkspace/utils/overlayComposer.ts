import type { Metrics } from './drawSelection';

export type OverlayDrawer = (ctx: CanvasRenderingContext2D, metrics: Metrics, opts?: unknown) => void;

export class OverlayComposer {
  private drawers: OverlayDrawer[] = [];

  addDrawer(d: OverlayDrawer) {
    this.drawers.push(d);
  }

  clear() {
    this.drawers.length = 0;
  }

  compose(ctx: CanvasRenderingContext2D, metrics: Metrics, opts?: unknown) {
    for (const d of this.drawers) {
        try {
          d(ctx, metrics, opts);
        } catch {
          // ignore drawer errors
      }
    }
  }
}

