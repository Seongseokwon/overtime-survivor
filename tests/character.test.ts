import { describe, expect, it } from 'vitest';
import { createWorld } from '../game/ecs/world';
import { CONTENT } from '../game/content/pack';

describe('캐릭터 데이터 적용', () => {
  it('인턴 J는 빠르고 체력이 낮은 시작 스탯을 받는다', () => {
    const w = createWorld(0x1234, CONTENT, 'intern_j');

    expect(w.characterIndex).toBe(1);
    expect(w.player.maxHp).toBe(75);
    expect(w.player.hp).toBe(75);
    expect(w.player.moveSpeed).toBeCloseTo(2.4, 8);
    expect(w.player.payMultiplier).toBe(1);
  });

  it('기존 기본 캐릭터는 기본 스탯과 수당 보정을 유지한다', () => {
    const w = createWorld(0x1234, CONTENT, 'char_k');

    expect(w.characterIndex).toBe(0);
    expect(w.player.maxHp).toBe(100);
    expect(w.player.moveSpeed).toBe(2);
    expect(w.player.payMultiplier).toBeCloseTo(1.1, 8);
  });

  it('알 수 없는 캐릭터 ID는 첫 번째 캐릭터로 안전하게 대체된다', () => {
    const w = createWorld(0x1234, CONTENT, 'missing_character');

    expect(w.characterIndex).toBe(0);
    expect(w.player.payMultiplier).toBeCloseTo(1.1, 8);
  });
});
