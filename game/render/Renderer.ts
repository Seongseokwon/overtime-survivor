/**
 * 렌더러 추상화 (TDD §3.2)
 *
 * 시스템 코드는 이 인터페이스만 알고 구현체를 몰라야 한다.
 * Canvas 특유 개념(CanvasRenderingContext2D, globalCompositeOperation 등)이
 * 여기에 새어 나가는 순간 WebGL 전환이 불가능해진다.
 *
 * drawSprite 가 객체가 아니라 정수 인덱스를 받는 것도 의도적이다 —
 * 핫 패스에서 객체를 만들지 않기 위해서다 (TDD §10).
 */
export interface RendererStats {
  drawCalls: number;
  lastFrameMs: number;
}

export interface Renderer {
  init(canvas: HTMLCanvasElement, viewW: number, viewH: number): Promise<void>;
  resize(viewW: number, viewH: number, cssScale: number): void;

  beginFrame(cameraX: number, cameraY: number): void;
  drawBackground(): void;
  drawSprite(frameIndex: number, x: number, y: number, flipX: boolean): void;
  drawRect(x: number, y: number, w: number, h: number, color: number, alpha: number): void;
  endFrame(): void;

  destroy(): void;
  readonly stats: RendererStats;
}
