import type { World } from '../ecs/world';
import { RngStream } from '../core/rng';

/**
 * 레벨업 판정 → 카드 3택 생성.
 * 카드가 대기 중이면 시뮬레이션 전체가 멈춘다 (TDD §5).
 * 리플레이에는 (frame, cardIndex) 만 기록된다.
 */
export function levelUp(w: World): void {
  if (w.pendingChoice) return;
  if (w.player.xp < w.player.xpToNext) return;

  w.player.xp -= w.player.xpToNext;
  w.player.level++;
  w.player.xpToNext = Math.round(5 + w.player.level * 3.2);

  const offerable: number[] = [];
  for (let i = 0; i < w.content.weapons.length; i++) {
    if (w.content.weapons[i]!.offerable) offerable.push(i);
  }
  const cards: number[] = [];
  for (let k = 0; k < 3 && offerable.length > 0; k++) {
    const pick = w.rng.int(RngStream.CardOffer, offerable.length);
    cards.push(offerable[pick]!);
    offerable.splice(pick, 1);
  }
  w.pendingChoice = cards;
}

/** 카드 선택 적용. 리플레이 재생 시에도 같은 함수를 같은 프레임에 호출한다. */
export function applyChoice(w: World, cardIndex: number): void {
  const cards = w.pendingChoice;
  if (!cards) return;
  const defIndex = cards[cardIndex];
  w.pendingChoice = null;
  if (defIndex === undefined) return;

  const existing = w.weapons.find((s) => s.defIndex === defIndex);
  if (existing) {
    const def = w.content.weapons[defIndex]!;
    if (existing.level < def.levels.length) existing.level++;
  } else if (w.weapons.length < 5) {
    w.weapons.push({ defIndex, level: 1, cooldown: 0 });
  }
}
