/**
 * 렌더 계층 이펙트 — 파편 파티클과 데미지 팝업.
 *
 * 여기는 시뮬레이션 밖이다. Math.random 을 자유롭게 쓸 수 있고,
 * 기기 성능에 따라 개수를 줄여도 게임 결과에 영향이 없다.
 * 시뮬은 "어디서 무슨 일이 일어났는가"만 FxBuffer 로 알려준다.
 */
import type { Renderer } from './Renderer';
import { PALETTE } from './atlas';

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

// ── 데미지 누적 팝업 ─────────────────────────────────────

const MAX_POPUPS = 24;
/** 이 거리 안에서 이 시간 안에 들어온 피해는 하나로 합친다 */
const MERGE_RADIUS2 = 18 * 18;
const MERGE_WINDOW = 24; // 프레임 (0.4초)

interface Popup { x: number; y: number; amount: number; age: number; born: number; hot: number }

/**
 * 뱀서라이크에서 모든 피격에 숫자를 띄우면 화면이 숫자로 뒤덮여 적이 안 보인다.
 * 그래서 가까운 위치에 짧은 시간 안에 들어온 피해를 하나로 합쳐 표시한다.
 * 정보는 다 주면서 화면은 덜 덮는다.
 */
export class DamagePopups {
  private list: Popup[] = [];

  add(x: number, y: number, amount: number): void {
    for (let i = 0; i < this.list.length; i++) {
      const p = this.list[i]!;
      if (p.age > MERGE_WINDOW) continue;
      const dx = p.x - x, dy = p.y - y;
      if (dx * dx + dy * dy < MERGE_RADIUS2) {
        p.amount += amount;
        p.x = x; p.y = Math.min(p.y, y);
        p.hot = 4;              // 합산될 때마다 살짝 커진다
        return;
      }
    }
    if (this.list.length >= MAX_POPUPS) this.list.shift();
    this.list.push({ x, y: y - 10, amount, age: 0, born: 0, hot: 4 });
  }

  update(dt: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]!;
      p.age += dt;
      p.born += dt;
      p.y -= 0.22 * dt;
      if (p.hot > 0) p.hot -= dt;
      if (p.age > MERGE_WINDOW + 22) this.list.splice(i, 1);
    }
  }

  draw(r: Renderer): void {
    for (let i = 0; i < this.list.length; i++) {
      const p = this.list[i]!;
      const fadeStart = MERGE_WINDOW + 6;
      const alpha = p.age < fadeStart ? 1 : Math.max(0, 1 - (p.age - fadeStart) / 16);
      const color = p.amount >= 60 ? PALETTE[10] : p.amount >= 25 ? PALETTE[11] : PALETTE[23];
      r.drawTextWorld(String(Math.round(p.amount)), p.x, p.y, color, alpha);
    }
  }

  get active(): number { return this.list.length; }
}
