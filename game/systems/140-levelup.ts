import type { LevelUpChoice, World } from '../ecs/world';
import { RngStream } from '../core/rng';

/** 무기 슬롯 상한 (PRD §4.2). 적을수록 합성 판단이 매 판 강제된다. */
export const MAX_WEAPON_SLOTS = 5;

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

  w.pendingChoice = buildChoices(w);
}

/** 슬롯에서 무기를 찾는다. 없으면 -1 */
function slotOf(w: World, defIndex: number): number {
  for (let i = 0; i < w.weapons.length; i++) {
    if (w.weapons[i]!.defIndex === defIndex) return i;
  }
  return -1;
}

/**
 * 지금 합성할 수 있는 레시피 인덱스들.
 *
 * 조건: 재료를 전부 보유하고, 각각 minLevel 이상이며, 결과물을 아직 갖고 있지 않다.
 * 결과물이 이미 있으면 제안하지 않는다 — 같은 무기를 두 개 들 수는 없다.
 */
function craftableRecipes(w: World, out: number[]): void {
  out.length = 0;
  for (let r = 0; r < w.recipeIndex.length; r++) {
    const ri = w.recipeIndex[r]!;
    if (ri.outputDef < 0) continue;
    if (slotOf(w, ri.outputDef) >= 0) continue;

    let ok = true;
    for (let k = 0; k < ri.inputDefs.length; k++) {
      const s = slotOf(w, ri.inputDefs[k]!);
      if (s < 0 || w.weapons[s]!.level < ri.inputMinLevels[k]!) { ok = false; break; }
    }
    if (ok) out.push(r);
  }
}

const scratchRecipes: number[] = [];
const scratchWeapons: number[] = [];

function buildChoices(w: World): LevelUpChoice[] {
  const cards: LevelUpChoice[] = [];

  // ① 합성 가능한 레시피가 있으면 한 칸을 합성으로 준다.
  //    원작 뱀서의 진화 카드와 같은 취급이다 — 놓치면 아까운 선택지가
  //    확실히 눈에 띄어야 "지금 합칠까, 더 키울까"라는 판단이 성립한다.
  craftableRecipes(w, scratchRecipes);
  if (scratchRecipes.length > 0) {
    const pick = w.rng.int(RngStream.CardOffer, scratchRecipes.length);
    cards.push({ kind: 'craft', recipeIndex: scratchRecipes[pick]! });
  }

  // ② 나머지는 무기 후보에서 뽑는다.
  //    - 보유 무기: 아직 최대 레벨이 아니면 강화 카드
  //    - 미보유 무기: 슬롯에 자리가 있을 때만 (자리가 없는데 뽑으면 아무 일도 안 일어난다)
  scratchWeapons.length = 0;
  const hasRoom = w.weapons.length < MAX_WEAPON_SLOTS;
  for (let d = 0; d < w.content.weapons.length; d++) {
    const def = w.content.weapons[d]!;
    const s = slotOf(w, d);
    if (s >= 0) {
      if (w.weapons[s]!.level < def.levels.length) scratchWeapons.push(d);
    } else if (def.offerable && hasRoom) {
      scratchWeapons.push(d);
    }
  }

  while (cards.length < 3 && scratchWeapons.length > 0) {
    const pick = w.rng.int(RngStream.CardOffer, scratchWeapons.length);
    cards.push({ kind: 'weapon', defIndex: scratchWeapons[pick]! });
    scratchWeapons.splice(pick, 1);
  }

  return cards;
}

/** 카드 선택 적용. 리플레이 재생 시에도 같은 함수를 같은 프레임에 호출한다. */
export function applyChoice(w: World, cardIndex: number): void {
  const cards = w.pendingChoice;
  if (!cards) return;
  const card = cards[cardIndex];
  w.pendingChoice = null;
  if (!card) return;

  if (card.kind === 'weapon') {
    applyWeapon(w, card.defIndex);
  } else {
    applyCraft(w, card.recipeIndex);
  }
}

function applyWeapon(w: World, defIndex: number): void {
  const s = slotOf(w, defIndex);
  if (s >= 0) {
    const def = w.content.weapons[defIndex]!;
    if (w.weapons[s]!.level < def.levels.length) w.weapons[s]!.level++;
  } else if (w.weapons.length < MAX_WEAPON_SLOTS) {
    w.weapons.push({ defIndex, level: 1, cooldown: 0 });
  }
}

/**
 * 합성 — 재료가 슬롯에서 사라지고 결과물 1개가 들어온다.
 *
 * 재료 2개 → 결과물 1개이므로 슬롯이 한 칸 비워진다. 새 무기를 넣을 여유가
 * 생기는 대신, 재료를 키우는 데 쓴 레벨업의 절반은 사라진다.
 */
function applyCraft(w: World, recipeIndex: number): void {
  const recipe = w.content.recipes[recipeIndex];
  const ri = w.recipeIndex[recipeIndex];
  if (!recipe || !ri || ri.outputDef < 0) return;

  // 재료 슬롯을 모아 검증한다. 하나라도 조건이 깨졌으면 아무것도 하지 않는다.
  const slots: number[] = [];
  let levelSum = 0;
  for (let k = 0; k < ri.inputDefs.length; k++) {
    const s = slotOf(w, ri.inputDefs[k]!);
    if (s < 0 || w.weapons[s]!.level < ri.inputMinLevels[k]!) return;
    slots.push(s);
    levelSum += w.weapons[s]!.level;
  }
  if (slotOf(w, ri.outputDef) >= 0) return;

  const outDef = w.content.weapons[ri.outputDef]!;
  let startLevel = 1;
  if (recipe.levelCarry === 'halfAverage') {
    const avg = levelSum / slots.length;
    startLevel = Math.max(1, Math.floor(avg / 2));
  }
  startLevel = Math.min(startLevel, outDef.levels.length);

  // 인덱스 내림차순으로 제거해야 앞쪽 제거가 뒤쪽 인덱스를 흔들지 않는다 (TDD §1.4)
  slots.sort((a, b) => b - a);
  for (let k = 0; k < slots.length; k++) w.weapons.splice(slots[k]!, 1);

  w.weapons.push({ defIndex: ri.outputDef, level: startLevel, cooldown: 0 });
  w.recipeDiscovered[recipeIndex] = 1;
  w.craftCount++;
}
