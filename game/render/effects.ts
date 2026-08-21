/**
 * 렌더 계층 이펙트 — 파편 파티클.
 *
 * 여기는 시뮬레이션 밖이다. Math.random 을 자유롭게 쓸 수 있고,
 * 기기 성능에 따라 개수를 줄여도 게임 결과에 영향이 없다.
 * 시뮬은 "어디서 무슨 일이 일어났는가"만 FxBuffer 로 알려준다.
 */
import type { Renderer } from './Renderer';

// ── 파편 파티클 ──────────────────────────────────────────

const MAX_PARTICLES = 512;

export class ParticleField {
  private x = new Float32Array(MAX_PARTICLES);
  private y = new Float32Array(MAX_PARTICLES);
  private vx = new Float32Array(MAX_PARTICLES);
  private vy = new Float32Array(MAX_PARTICLES);
  private life = new Float32Array(MAX_PARTICLES);
  private maxLife = new Float32Array(MAX_PARTICLES);
  private color = new Uint8Array(MAX_PARTICLES);
  private size = new Uint8Array(MAX_PARTICLES);
  private count = 0;

  /** 저사양 기기에서 이 값을 낮추면 부하가 준다. 게임 결과는 그대로다. */
  quality = 1;

  get active(): number { return this.count; }

  private add(x: number, y: number, vx: number, vy: number, life: number, color: number, size: number): void {
    if (this.count >= MAX_PARTICLES) return;
    const i = this.count++;
    this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy;
    this.life[i] = life; this.maxLife[i] = life; this.color[i] = color; this.size[i] = size;
  }

  private remove(i: number): void {
    const last = --this.count;
    if (i === last) return;
    this.x[i] = this.x[last]!; this.y[i] = this.y[last]!;
    this.vx[i] = this.vx[last]!; this.vy[i] = this.vy[last]!;
    this.life[i] = this.life[last]!; this.maxLife[i] = this.maxLife[last]!;
    this.color[i] = this.color[last]!; this.size[i] = this.size[last]!;
  }

  /** 적이 죽은 자리에 파편을 흩뿌린다 */
  burst(x: number, y: number, tint: number): void {
    const n = Math.max(2, Math.round(6 * this.quality));
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.7 + Math.random() * 1.6;
      this.add(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 12 + Math.random() * 10, tint, Math.random() < 0.4 ? 2 : 1);
    }
  }

  /** 착탄 스파크 — 작고 짧게 */
  spark(x: number, y: number): void {
    if (this.quality < 0.5) return;
    const n = Math.max(1, Math.round(2 * this.quality));
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.2 + Math.random();
      this.add(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 5 + Math.random() * 4, 11, 1);
    }
  }

  update(dt: number): void {
    for (let i = this.count - 1; i >= 0; i--) {
      this.x[i] = this.x[i]! + this.vx[i]! * dt;
      this.y[i] = this.y[i]! + this.vy[i]! * dt;
      this.vx[i] = this.vx[i]! * 0.9;
      this.vy[i] = this.vy[i]! * 0.9;
      this.life[i] = this.life[i]! - dt;
      if (this.life[i]! <= 0) this.remove(i);
    }
  }

  draw(r: Renderer): void {
    for (let i = 0; i < this.count; i++) {
      const t = this.life[i]! / this.maxLife[i]!;
      const s = this.size[i]!;
      r.drawRect(this.x[i]! - s / 2, this.y[i]! - s / 2, s, s, this.color[i]!, t > 1 ? 1 : t);
    }
  }
}
