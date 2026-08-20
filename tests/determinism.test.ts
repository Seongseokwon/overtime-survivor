import { describe, it, expect } from 'vitest';
import { createWorld } from '../game/ecs/world';
import { stepWorld } from '../game/systems/pipeline';
import { applyChoice } from '../game/systems/140-levelup';
import { worldHash } from '../game/core/worldhash';
import { CONTENT, assertContentValid } from '../game/content/pack';
import { encodeDirection, DIR_NONE, type InputFrame } from '../game/input/InputFrame';
import { createRngSet, RngStream } from '../game/core/rng';

/** 결정론적으로 생성되는 가짜 플레이어 입력 (테스트가 재현 가능해야 하므로) */
function makeInputs(seed: number, frames: number): InputFrame[] {
  const rng = createRngSet(seed);
  const out: InputFrame[] = [];
  let cur: InputFrame = DIR_NONE;
  for (let f = 0; f < frames; f++) {
    if (f % 23 === 0) {
      const r = rng.next(RngStream.Cosmetic);
      cur = r < 0.15 ? DIR_NONE
        : encodeDirection(Math.cos(r * 100), Math.sin(r * 100));
    }
    out.push(cur);
  }
  return out;
}

/** 카드가 뜨면 항상 0번을 고른다 — 재현 가능한 정책 */
function simulate(seed: number, frames: number) {
  const w = createWorld(seed, CONTENT);
  w.weapons.push({ defIndex: 0, level: 1, cooldown: 0 });
  const inputs = makeInputs(seed, frames);
  const checkpoints: number[] = [];
  for (let f = 0; f < frames; f++) {
    if (w.pendingChoice) applyChoice(w, 0);
    stepWorld(w, inputs[f]!);
    if (w.frame > 0 && w.frame % 600 === 0) checkpoints.push(worldHash(w));
  }
  return {
    hash: worldHash(w),
    checkpoints,
    kills: w.killCount,
    level: w.player.level,
    enemies: w.eCount,
    weapons: w.weapons.length,
  };
}

describe('결정론 시뮬레이션 (TDD §1)', () => {
  it('콘텐츠 팩이 참조 무결성을 만족한다', () => {
    expect(() => assertContentValid()).not.toThrow();
  });

  it('같은 시드 + 같은 입력 → 같은 월드 해시', () => {
    const a = simulate(0xc0ffee, 3600);
    const b = simulate(0xc0ffee, 3600);
    expect(a.hash).toBe(b.hash);
    expect(a.kills).toBe(b.kills);
    expect(a.level).toBe(b.level);
  });

  it('체크포인트 해시가 전 구간 일치한다', () => {
    const a = simulate(0xc0ffee, 3600);
    const b = simulate(0xc0ffee, 3600);
    expect(a.checkpoints.length).toBeGreaterThan(4);
    expect(a.checkpoints).toEqual(b.checkpoints);
  });

  it('다른 시드는 다른 결과를 낸다', () => {
    const a = simulate(0xc0ffee, 1800);
    const c = simulate(0xbadbeef, 1800);
    expect(a.hash).not.toBe(c.hash);
  });

  it('시뮬레이션이 실제로 진행된다 (빈 월드가 아니다)', () => {
    const a = simulate(0x1234, 3600);
    expect(a.kills).toBeGreaterThan(50);
    expect(a.level).toBeGreaterThan(2);
    expect(a.enemies).toBeGreaterThan(20);
    expect(a.weapons).toBeGreaterThan(1);
  });

  it('난수 스트림이 분리되어 있다 — Cosmetic 소비가 시뮬에 영향을 주지 않는다', () => {
    const base = simulate(0x777, 1200);

    const w = createWorld(0x777, CONTENT);
    w.weapons.push({ defIndex: 0, level: 1, cooldown: 0 });
    const inputs = makeInputs(0x777, 1200);
    for (let f = 0; f < 1200; f++) {
      // 매 프레임 Cosmetic 스트림을 임의로 소비한다 (파티클이 기기마다 다른 상황 재현)
      for (let k = 0; k < (f % 7); k++) w.rng.next(RngStream.Cosmetic);
      if (w.pendingChoice) applyChoice(w, 0);
      stepWorld(w, inputs[f]!);
    }
    expect(worldHash(w)).toBe(base.hash);
  });
});
