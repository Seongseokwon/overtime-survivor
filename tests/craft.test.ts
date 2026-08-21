import { describe, it, expect } from 'vitest';
import { createWorld } from '../game/ecs/world';
import { stepWorld } from '../game/systems/pipeline';
import { applyChoice, levelUp, MAX_WEAPON_SLOTS } from '../game/systems/140-levelup';
import { worldHash } from '../game/core/worldhash';
import { CONTENT } from '../game/content/pack';
import { DIR_NONE } from '../game/input/InputFrame';

const defIndexOf = (id: string): number => CONTENT.weapons.findIndex((w) => w.id === id);

/** 슬롯을 직접 구성해 합성 조건을 만든다 */
function worldWith(slots: Array<[string, number]>) {
  const w = createWorld(0x1234, CONTENT);
  for (const [id, level] of slots) {
    w.weapons.push({ defIndex: defIndexOf(id), level, cooldown: 0 });
  }
  return w;
}

/** 합성 카드가 뜰 때까지 레벨업을 강제로 돌린다 */
function forceLevelUp(w: ReturnType<typeof worldWith>): void {
  w.player.xp = w.player.xpToNext;
  levelUp(w);
}

describe('무기 합성 (PRD §4.2)', () => {
  it('재료 조건을 만족하면 합성 카드가 3택에 등장한다', () => {
    const w = worldWith([['stapler', 3], ['ballpen', 3]]);
    forceLevelUp(w);
    const cards = w.pendingChoice!;
    expect(cards.some((c) => c.kind === 'craft')).toBe(true);
  });

  it('재료 레벨이 모자라면 합성 카드가 뜨지 않는다', () => {
    const w = worldWith([['stapler', 3], ['ballpen', 2]]);
    forceLevelUp(w);
    expect(w.pendingChoice!.every((c) => c.kind === 'weapon')).toBe(true);
  });

  it('합성하면 재료가 사라지고 슬롯이 한 칸 비워진다', () => {
    const w = worldWith([['stapler', 4], ['ballpen', 4], ['coffee', 1]]);
    expect(w.weapons.length).toBe(3);

    forceLevelUp(w);
    const idx = w.pendingChoice!.findIndex((c) => c.kind === 'craft');
    expect(idx).toBeGreaterThanOrEqual(0);
    applyChoice(w, idx);

    // 재료 2개 → 결과물 1개. 순증 -1
    expect(w.weapons.length).toBe(2);
    expect(w.weapons.some((s) => s.defIndex === defIndexOf('stapler'))).toBe(false);
    expect(w.weapons.some((s) => s.defIndex === defIndexOf('ballpen'))).toBe(false);
    expect(w.weapons.some((s) => s.defIndex === defIndexOf('approval_board'))).toBe(true);
    expect(w.craftCount).toBe(1);
  });

  it('레벨 승계는 재료 평균의 절반이다 (투자한 만큼 공짜로 오지 않는다)', () => {
    const w = worldWith([['stapler', 5], ['ballpen', 5]]);
    forceLevelUp(w);
    applyChoice(w, w.pendingChoice!.findIndex((c) => c.kind === 'craft'));
    const out = w.weapons.find((s) => s.defIndex === defIndexOf('approval_board'))!;
    expect(out.level).toBe(2); // floor(5 / 2)
  });

  it('결과물을 이미 갖고 있으면 같은 합성을 다시 제안하지 않는다', () => {
    const w = worldWith([['approval_board', 1], ['stapler', 3], ['ballpen', 3]]);
    forceLevelUp(w);
    expect(w.pendingChoice!.every((c) => c.kind === 'weapon')).toBe(true);
  });

  it('T2 합성 — 합성물끼리 다시 합칠 수 있다', () => {
    const w = worldWith([['approval_board', 2], ['espresso_bomb', 2]]);
    forceLevelUp(w);
    const idx = w.pendingChoice!.findIndex((c) => c.kind === 'craft');
    expect(idx).toBeGreaterThanOrEqual(0);
    applyChoice(w, idx);
    expect(w.weapons.length).toBe(1);
    expect(w.weapons[0]!.defIndex).toBe(defIndexOf('monday_morning'));
  });

  it('슬롯이 꽉 차면 미보유 무기 카드를 제안하지 않는다', () => {
    const w = worldWith([
      ['stapler', 1], ['ballpen', 1], ['business_card', 1], ['umbrella', 1], ['wireless_mouse', 1],
    ]);
    expect(w.weapons.length).toBe(MAX_WEAPON_SLOTS);
    forceLevelUp(w);
    for (const c of w.pendingChoice!) {
      if (c.kind !== 'weapon') continue;
      // 제안된 무기는 전부 이미 보유한 것이어야 한다 (= 강화 카드)
      expect(w.weapons.some((s) => s.defIndex === c.defIndex)).toBe(true);
    }
  });

  it('슬롯이 비워지면 다시 새 무기를 제안한다', () => {
    const w = worldWith([
      ['stapler', 3], ['ballpen', 3], ['business_card', 1], ['umbrella', 1], ['coffee', 1],
    ]);
    forceLevelUp(w);
    applyChoice(w, w.pendingChoice!.findIndex((c) => c.kind === 'craft'));
    expect(w.weapons.length).toBe(4); // 5 - 2 + 1

    // 이제 자리가 있으므로 미보유 무기가 후보에 들어간다
    let sawUnowned = false;
    for (let attempt = 0; attempt < 40 && !sawUnowned; attempt++) {
      forceLevelUp(w);
      for (const c of w.pendingChoice!) {
        if (c.kind === 'weapon' && !w.weapons.some((s) => s.defIndex === c.defIndex)) sawUnowned = true;
      }
      w.pendingChoice = null;
    }
    expect(sawUnowned).toBe(true);
  });
});

describe('합성이 결정론을 깨지 않는다', () => {
  it('같은 시드 + 같은 선택 정책 → 같은 해시', () => {
    const run = (): { hash: number; crafts: number } => {
      const w = createWorld(0xcafe, CONTENT);
      w.weapons.push({ defIndex: 0, level: 1, cooldown: 0 });
      for (let f = 0; f < 5400; f++) {
        // 합성 카드가 있으면 항상 합성을 고른다 — 재현 가능한 정책
        if (w.pendingChoice) {
          const ci = w.pendingChoice.findIndex((c) => c.kind === 'craft');
          applyChoice(w, ci >= 0 ? ci : 0);
        }
        stepWorld(w, DIR_NONE);
      }
      return { hash: worldHash(w), crafts: w.craftCount };
    };
    const a = run();
    const b = run();
    expect(a.hash).toBe(b.hash);
    expect(a.crafts).toBe(b.crafts);
  });
});
