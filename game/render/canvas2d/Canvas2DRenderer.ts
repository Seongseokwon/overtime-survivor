import type { Renderer, RendererStats } from '../Renderer';
import { ATLAS_TILE, ATLAS_COLS, PALETTE, buildPlaceholderAtlas, buildWhiteAtlas } from '../atlas';

export class Canvas2DRenderer implements Renderer {
  private ctx!: CanvasRenderingContext2D;
  private atlas!: HTMLCanvasElement;
  private atlasWhite!: HTMLCanvasElement;
  private floorPattern!: CanvasPattern;
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
    this.atlasWhite = buildWhiteAtlas(this.atlas);
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

  /**
   * 바닥 타일.
   *
   * v1은 32px 체커보드였는데, 스크롤할 때 고주파 패턴이 흘러 어지러웠다.
   * 그래서 두 가지를 바꿨다.
   *   - 대비를 거의 없앤다. 얼룩은 바닥색과 명도 차이가 한 단계뿐이다.
   *   - 규칙적인 격자 대신 불규칙한 반점을 쓴다. 반복 주기가 256px 로 길어져
   *     "패턴이 흐른다"는 인상이 사라진다.
   * 자기 운동 인지는 배경이 아니라 decor.ts 의 랜드마크가 담당한다.
   */
  private buildBackground(): void {
    const TILE = 256;
    const t = document.createElement('canvas');
    t.width = TILE; t.height = TILE;
    const b = t.getContext('2d')!;

    b.fillStyle = PALETTE[1];
    b.fillRect(0, 0, TILE, TILE);

    // 결정론적 반점 — 매 실행 같은 무늬여야 스크린샷 비교가 가능하다
    let h = 0x9e3779b9 >>> 0;
    const rnd = (): number => {
      h ^= h << 13; h >>>= 0;
      h ^= h >>> 17;
      h ^= h << 5; h >>>= 0;
      return h / 4294967296;
    };
    b.fillStyle = PALETTE[2];
    for (let i = 0; i < 260; i++) {
      const x = (rnd() * TILE) | 0;
      const y = (rnd() * TILE) | 0;
      const w = 1 + ((rnd() * 3) | 0);
      b.fillRect(x, y, w, 1);
    }
    b.fillStyle = PALETTE[0];
    for (let i = 0; i < 90; i++) {
      const x = (rnd() * TILE) | 0;
      const y = (rnd() * TILE) | 0;
      b.fillRect(x, y, 2, 1);
    }

    this.floorPattern = this.ctx.createPattern(t, 'repeat')!;
  }

  beginFrame(cameraX: number, cameraY: number): void {
    this.frameStart = performance.now();
    this.stats.drawCalls = 0;
    // 카메라를 픽셀 그리드에 스냅한다. 안 하면 스크롤 시 도트가 떨린다 (TDD §2.1)
    this.camX = Math.round(cameraX);
    this.camY = Math.round(cameraY);
  }

  drawBackground(): void {
    const ctx = this.ctx;
    const TILE = 256;
    ctx.save();
    // 카메라를 타일 주기로 접어 넣는다. 드로우콜 1회로 화면 전체를 채운다.
    ctx.translate(-(this.camX % TILE), -(this.camY % TILE));
    ctx.fillStyle = this.floorPattern;
    ctx.fillRect(0, 0, this.viewW + TILE, this.viewH + TILE);
    ctx.restore();
    this.stats.drawCalls++;
  }

  drawSprite(frameIndex: number, x: number, y: number, _flipX: boolean, white = false, squash = 0): void {
    const sx = (frameIndex % ATLAS_COLS) * ATLAS_TILE;
    const sy = Math.floor(frameIndex / ATLAS_COLS) * ATLAS_TILE;
    const dx = (x - this.camX - 16) | 0;
    const dy = (y - this.camY - 16) | 0;
    if (dx < -ATLAS_TILE || dy < -ATLAS_TILE || dx > this.viewW || dy > this.viewH) return;
    const src = white ? this.atlasWhite : this.atlas;
    if (squash === 0) {
      this.ctx.drawImage(src, sx, sy, ATLAS_TILE, ATLAS_TILE, dx, dy, ATLAS_TILE, ATLAS_TILE);
    } else {
      // 가로로 늘리고 세로로 누른다. 픽셀 정수를 유지하려고 정수 단위로만 변형한다.
      const s = squash | 0;
      this.ctx.drawImage(src, sx, sy, ATLAS_TILE, ATLAS_TILE,
        dx - s, dy + s, ATLAS_TILE + s * 2, ATLAS_TILE - s * 2);
    }
    this.stats.drawCalls++;
  }

  drawTextWorld(text: string, x: number, y: number, cssColor: string, alpha: number): void {
    const dx = (x - this.camX) | 0;
    const dy = (y - this.camY) | 0;
    if (dx < -40 || dy < -20 || dx > this.viewW + 40 || dy > this.viewH + 20) return;
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.font = '8px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    ctx.fillText(text, dx + 1, dy + 1);
    ctx.fillStyle = cssColor;
    ctx.fillText(text, dx, dy);
    ctx.globalAlpha = 1;
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
