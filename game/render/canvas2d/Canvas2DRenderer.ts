import type { Renderer, RendererStats } from '../Renderer';
import { ATLAS_TILE, ATLAS_COLS, PALETTE, buildPlaceholderAtlas } from '../atlas';
import { CELL } from '../../core/constants';

export class Canvas2DRenderer implements Renderer {
  private ctx!: CanvasRenderingContext2D;
  private atlas!: HTMLCanvasElement;
  private bg!: HTMLCanvasElement;
  private viewW = 480;
  private viewH = 270;
  private camX = 0;
  private camY = 0;
  private frameStart = 0;

  readonly stats: RendererStats = { drawCalls: 0, lastFrameMs: 0 };

  async init(canvas: HTMLCanvasElement, viewW: number, viewH: number): Promise<void> {
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) throw new Error('2D 컨텍스트를 얻지 못했습니다');
    this.ctx = ctx;
    this.atlas = buildPlaceholderAtlas();
    this.resizeInternal(viewW, viewH);
  }

  resize(viewW: number, viewH: number, cssScale: number): void {
    this.resizeInternal(viewW, viewH);
    const cv = this.ctx.canvas;
    cv.style.width = `${viewW * cssScale}px`;
    cv.style.height = `${viewH * cssScale}px`;
  }

  private resizeInternal(viewW: number, viewH: number): void {
    this.viewW = viewW; this.viewH = viewH;
    const cv = this.ctx.canvas;
    cv.width = viewW; cv.height = viewH;
    this.ctx.imageSmoothingEnabled = false;
    this.buildBackground();
  }

  /** 배경은 오프스크린에 1회 렌더한 뒤 매 프레임 blit 한다 (TDD §8.1) */
  private buildBackground(): void {
    const bg = document.createElement('canvas');
    bg.width = this.viewW + CELL;
    bg.height = this.viewH + CELL;
    const b = bg.getContext('2d')!;
    for (let y = 0; y < bg.height; y += 32) {
      for (let x = 0; x < bg.width; x += 32) {
        b.fillStyle = ((x / 32 + y / 32) & 1) ? PALETTE[1] : PALETTE[2];
        b.fillRect(x, y, 32, 32);
        b.fillStyle = PALETTE[3];
        b.fillRect(x, y, 32, 1);
        b.fillRect(x, y, 1, 32);
      }
    }
    this.bg = bg;
  }

  beginFrame(cameraX: number, cameraY: number): void {
    this.frameStart = performance.now();
    this.stats.drawCalls = 0;
    // 카메라를 픽셀 그리드에 스냅한다. 안 하면 스크롤 시 도트가 떨린다 (TDD §2.1)
    this.camX = Math.round(cameraX);
    this.camY = Math.round(cameraY);
  }

  drawBackground(): void {
    this.ctx.drawImage(this.bg, -(this.camX % 32), -(this.camY % 32));
    this.stats.drawCalls++;
  }

  drawSprite(frameIndex: number, x: number, y: number, _flipX: boolean): void {
    const sx = (frameIndex % ATLAS_COLS) * ATLAS_TILE;
    const sy = Math.floor(frameIndex / ATLAS_COLS) * ATLAS_TILE;
    const dx = (x - this.camX - 16) | 0;
    const dy = (y - this.camY - 16) | 0;
    if (dx < -ATLAS_TILE || dy < -ATLAS_TILE || dx > this.viewW || dy > this.viewH) return;
    this.ctx.drawImage(this.atlas, sx, sy, ATLAS_TILE, ATLAS_TILE, dx, dy, ATLAS_TILE, ATLAS_TILE);
    this.stats.drawCalls++;
  }

  drawRect(x: number, y: number, w: number, h: number, color: number, alpha: number): void {
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = PALETTE[color] ?? '#ffffff';
    this.ctx.fillRect((x - this.camX) | 0, (y - this.camY) | 0, w, h);
    this.ctx.globalAlpha = 1;
    this.stats.drawCalls++;
  }

  endFrame(): void {
    this.stats.lastFrameMs = performance.now() - this.frameStart;
  }

  destroy(): void { /* Canvas 2D는 해제할 GPU 자원이 없다 */ }
}
