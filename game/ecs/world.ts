/**
 * 월드 상태 — SoA (Structure of Arrays) (TDD §4)
 *
 * TDD 초안은 모듈 레벨 배열을 예시로 들었으나, 서버가 여러 리플레이를
 * 동시에 검증하려면 월드 인스턴스가 여러 개 필요하다. 따라서 팩토리로 만든다.
 * SoA·조밀 배열·swap-remove·고정 풀이라는 성질은 그대로다.
 */
import {
  MAX_ENEMIES, MAX_PROJECTILES, MAX_GEMS, MAX_ZONES,
  GRID_CELLS, CELL_CAPACITY, WORLD_W, WORLD_H,
} from '../core/constants';
import { createRngSet, type RngSet } from '../core/rng';
import type { ContentPack } from '../content/schema';

export interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  moveSpeed: number;
  damageMul: number;
  cooldownReduction: number;
  pickupRange: number;
  payMultiplier: number;
  level: number;
  xp: number;
  xpToNext: number;
}

export interface WeaponSlot {
  defIndex: number;   // content.weapons 인덱스
  level: number;      // 1-based
  cooldown: number;   // 남은 프레임
}

/**
 * 레벨업 3택에 오르는 카드.
 *
 * 'craft' 는 슬롯을 소비한다 — 재료 무기가 사라지고 결과물 1개가 들어오므로
 * 슬롯이 비워진다. 이게 이 게임의 시그니처 트레이드오프다 (PRD §4.2).
 */
export type LevelUpChoice =
  | { kind: 'weapon'; defIndex: number }
  | { kind: 'craft'; recipeIndex: number };

/** 레시피의 재료/결과물을 인덱스로 미리 풀어둔다. 매 레벨업마다 문자열 탐색을 하지 않기 위해서다. */
export interface RecipeIndex {
  inputDefs: number[];
  inputMinLevels: number[];
  outputDef: number;
}

/**
 * 시각 효과 이벤트 버퍼 (TDD §1.2 Cosmetic 경계)
 *
 * 시뮬레이션은 "무슨 일이 어디서 일어났는가"만 기록하고, 그것을 어떻게
 * 보여줄지는 렌더 계층이 정한다. 파티클 개수·색·수명 같은 것은 기기 성능에
 * 따라 달라져도 되므로 시뮬에 들어가면 안 된다.
 *
 * 이 버퍼는 월드 해시에 포함되지 않는다 — 여기 기록된 좌표는 전부
 * 시뮬 상태에서 파생된 값이라, 해시에 넣어봐야 중복 검사일 뿐이다.
 */
export interface FxBuffer {
  deathX: Float32Array; deathY: Float32Array; deathDef: Uint8Array; deathN: number;
  sparkX: Float32Array; sparkY: Float32Array; sparkN: number;
  /** 이번 소비 구간에 플레이어가 받은 총 피해 */
  playerHit: number;
  killsThisFrame: number;
  /** 소비 구간 누적 처치 수 — 효과음 빈도 조절용 */
  killsPending: number;
}

const FX_CAP = 256;

export interface World {
  frame: number;
  rng: RngSet;
  content: ContentPack;
  /** content.characters 의 인덱스. 리플레이 헤더의 characterId와 같은 의미다. */
  characterIndex: number;

  player: PlayerState;
  weapons: WeaponSlot[];

  /** 레벨업 카드 선택 대기 중이면 시뮬레이션이 멈춘다 (TDD §5, 시스템 140) */
  pendingChoice: LevelUpChoice[] | null;

  /** 레시피 인덱스 캐시 (content.recipes 와 순서가 같다) */
  recipeIndex: RecipeIndex[];
  /** 이 런에서 발견한 레시피. 도감 해금은 M4 메타에서 서버로 올린다 */
  recipeDiscovered: Uint8Array;
  /** 이 런에서 실제로 수행한 합성 횟수 — 밸런스 시뮬 집계용 */
  craftCount: number;

  // --- 적 ---
  eX: Float32Array; eY: Float32Array;
  eVX: Float32Array; eVY: Float32Array;
  eHp: Float32Array; eDefId: Uint16Array;
  eFlags: Uint8Array; eGen: Uint16Array;
  /** 피격 시 흰색으로 덮이는 남은 프레임 (시각용이지만 결정론적이다) */
  eFlash: Uint8Array;
  /** 넉백 속도. 매 프레임 감쇠한다 */
  eKbX: Float32Array; eKbY: Float32Array;
  /** 개체별 접촉 피해 쿨다운. 없으면 "겹치면 즉사"가 된다 */
  eContactCd: Uint8Array;
  eCount: number;

  // --- 투사체 ---
  pX: Float32Array; pY: Float32Array;
  pVX: Float32Array; pVY: Float32Array;
  pLife: Uint16Array; pPierce: Int16Array; pDamage: Float32Array;
  /** 이동 방식 (ProjKind) */
  pKind: Uint8Array;
  /** 생성 후 경과 프레임 — 부메랑 귀환 판정에 쓴다 */
  pAge: Uint16Array;
  /** 궤도 무기의 현재 각도 / 각속도 */
  pAngle: Float32Array; pOmega: Float32Array; pOrbitR: Float32Array;
  /**
   * 재타격 금지 잔여 프레임.
   * 궤도처럼 오래 남는 투사체는 관통이 무제한이라, 이게 없으면
   * 한 프레임에 같은 적을 계속 때려 즉사시킨다.
   */
  pHitCd: Uint8Array;
  pCount: number;

  // --- 장판 (형광펜 자국, 커피 화상 등) ---
  zX: Float32Array; zY: Float32Array;
  zRadius: Float32Array; zDamage: Float32Array;
  zLife: Uint16Array; zAge: Uint16Array;
  /** 생성 시 수명 — 남은 비율로 페이드하려면 필요하다 */
  zMaxLife: Uint16Array;
  /** 0 = 바닥 자국(은은하게), 1 = 폭발(짧고 밝게) */
  zStyle: Uint8Array;
  zCount: number;

  // --- 젬 ---
  gX: Float32Array; gY: Float32Array; gValue: Uint16Array;
  gCount: number;

  // --- 공간 해시 (TDD §6) ---
  cellStore: Int16Array;
  cellCount: Uint8Array;

  /** 제거 목록. 순회 중 제거하지 않고 모았다가 일괄 처리한다 (TDD §1.4) */
  removeBuf: Int32Array;
  removeN: number;

  killCount: number;
  elapsedFrames: number;

  /**
   * 히트스톱 — 남은 정지 프레임.
   * 화면 흔들림 대신 쓰는 타격 강조 장치다. 시뮬 안에 두어야 리플레이가
   * 정확히 재현되므로, 코스메틱이 아니라 시뮬 상태로 취급한다.
   */
  hitstop: number;
  /** 히트스톱 재발동 금지 잔여 프레임 */
  hitstopCd: number;

  fx: FxBuffer;
}

function buildRecipeIndex(content: ContentPack): RecipeIndex[] {
  const defIndexOf = (id: string): number => {
    for (let i = 0; i < content.weapons.length; i++) if (content.weapons[i]!.id === id) return i;
    return -1;
  };
  return content.recipes.map((r) => ({
    inputDefs: r.inputs.map((i) => defIndexOf(i.weaponId)),
    inputMinLevels: r.inputs.map((i) => i.minLevel),
    outputDef: defIndexOf(r.outputWeaponId),
  }));
}

function applyCharacterModifiers(w: World, characterIndex: number): void {
  const character = w.content.characters[characterIndex];
  if (!character) return;

  const apply = (base: number, op: 'add' | 'mul' | 'ratio', value: number): number => {
    if (op === 'add') return base + value;
    if (op === 'mul') return base * value;
    return base + value;
  };

  for (const modifier of character.modifiers) {
    switch (modifier.stat) {
      case 'maxHp':
        w.player.maxHp = apply(w.player.maxHp, modifier.op, modifier.value);
        w.player.hp = w.player.maxHp;
        break;
      case 'moveSpeed':
        w.player.moveSpeed = apply(w.player.moveSpeed, modifier.op, modifier.value);
        break;
      case 'damageMul':
        w.player.damageMul = apply(w.player.damageMul, modifier.op, modifier.value);
        break;
      case 'cooldownReduction':
        w.player.cooldownReduction = Math.min(0.6, Math.max(0, apply(w.player.cooldownReduction, modifier.op, modifier.value)));
        break;
      case 'pickupRange':
        w.player.pickupRange = apply(w.player.pickupRange, modifier.op, modifier.value);
        break;
      case 'payMultiplier':
        w.player.payMultiplier = apply(w.player.payMultiplier, modifier.op, modifier.value);
        break;
      default:
        // projectileCount, defense 등 아직 PlayerState에 없는 축은
        // 콘텐츠 데이터에 보존하고 해당 시스템이 생길 때 연결한다.
        break;
    }
  }
}

export function createWorld(seed: number, content: ContentPack, characterId?: string): World {
  const characterIndex = characterId
    ? content.characters.findIndex((c) => c.id === characterId)
    : 0;
  const resolvedCharacterIndex = characterIndex >= 0 ? characterIndex : 0;

  const w: World = {
    frame: 0,
    rng: createRngSet(seed),
    content,
    characterIndex: resolvedCharacterIndex,
    player: {
      x: WORLD_W / 2, y: WORLD_H / 2,
      hp: 100, maxHp: 100,
      // 기본 캐릭터는 정확히 2px/frame (= 120 u/s)로 시작한다.
      // 캐릭터 보정으로 소수 속도가 될 수 있지만, 카메라는 여전히 픽셀 그리드에
      // 스냅된다. 실제 캐릭터별 모션 보정은 플레이테스트에서 조정한다.
      moveSpeed: 2,
      damageMul: 1,
      cooldownReduction: 0,
      pickupRange: 60,
      payMultiplier: 1,
      level: 1, xp: 0, xpToNext: 5,
    },
    weapons: [],
    pendingChoice: null,
    recipeIndex: buildRecipeIndex(content),
    recipeDiscovered: new Uint8Array(content.recipes.length),
    craftCount: 0,

    eX: new Float32Array(MAX_ENEMIES), eY: new Float32Array(MAX_ENEMIES),
    eVX: new Float32Array(MAX_ENEMIES), eVY: new Float32Array(MAX_ENEMIES),
    eHp: new Float32Array(MAX_ENEMIES), eDefId: new Uint16Array(MAX_ENEMIES),
    eFlags: new Uint8Array(MAX_ENEMIES), eGen: new Uint16Array(MAX_ENEMIES),
    eFlash: new Uint8Array(MAX_ENEMIES),
    eKbX: new Float32Array(MAX_ENEMIES), eKbY: new Float32Array(MAX_ENEMIES),
    eContactCd: new Uint8Array(MAX_ENEMIES),
    eCount: 0,

    pX: new Float32Array(MAX_PROJECTILES), pY: new Float32Array(MAX_PROJECTILES),
    pVX: new Float32Array(MAX_PROJECTILES), pVY: new Float32Array(MAX_PROJECTILES),
    pLife: new Uint16Array(MAX_PROJECTILES), pPierce: new Int16Array(MAX_PROJECTILES),
    pDamage: new Float32Array(MAX_PROJECTILES),
    pKind: new Uint8Array(MAX_PROJECTILES), pAge: new Uint16Array(MAX_PROJECTILES),
    pAngle: new Float32Array(MAX_PROJECTILES), pOmega: new Float32Array(MAX_PROJECTILES),
    pOrbitR: new Float32Array(MAX_PROJECTILES), pHitCd: new Uint8Array(MAX_PROJECTILES),
    pCount: 0,

    zX: new Float32Array(MAX_ZONES), zY: new Float32Array(MAX_ZONES),
    zRadius: new Float32Array(MAX_ZONES), zDamage: new Float32Array(MAX_ZONES),
    zLife: new Uint16Array(MAX_ZONES), zAge: new Uint16Array(MAX_ZONES),
    zMaxLife: new Uint16Array(MAX_ZONES), zStyle: new Uint8Array(MAX_ZONES),
    zCount: 0,

    gX: new Float32Array(MAX_GEMS), gY: new Float32Array(MAX_GEMS),
    gValue: new Uint16Array(MAX_GEMS),
    gCount: 0,

    cellStore: new Int16Array(GRID_CELLS * CELL_CAPACITY),
    cellCount: new Uint8Array(GRID_CELLS),

    removeBuf: new Int32Array(MAX_ENEMIES),
    removeN: 0,
    killCount: 0,
    elapsedFrames: 0,
    hitstop: 0,
    hitstopCd: 0,
    fx: {
      deathX: new Float32Array(FX_CAP), deathY: new Float32Array(FX_CAP),
      deathDef: new Uint8Array(FX_CAP), deathN: 0,
      sparkX: new Float32Array(FX_CAP), sparkY: new Float32Array(FX_CAP), sparkN: 0,
      playerHit: 0,
      killsThisFrame: 0, killsPending: 0,
    },
  };
  applyCharacterModifiers(w, resolvedCharacterIndex);
  for (let i = 0; i < content.recipes.length; i++) {
    if (content.recipes[i]!.discoveredByDefault) w.recipeDiscovered[i] = 1;
  }
  return w;
}

// --- FX 이벤트 기록 (버퍼가 차면 조용히 버린다) ---

export function fxDeath(w: World, x: number, y: number, defId: number): void {
  const fx = w.fx;
  if (fx.deathN >= FX_CAP) return;
  fx.deathX[fx.deathN] = x; fx.deathY[fx.deathN] = y; fx.deathDef[fx.deathN] = defId;
  fx.deathN++;
}

export function fxSpark(w: World, x: number, y: number): void {
  const fx = w.fx;
  if (fx.sparkN >= FX_CAP) return;
  fx.sparkX[fx.sparkN] = x; fx.sparkY[fx.sparkN] = y;
  fx.sparkN++;
}

/** 렌더가 이벤트를 소비한 뒤 호출한다. */
export function clearFx(w: World): void {
  const fx = w.fx;
  fx.deathN = 0; fx.sparkN = 0;
  fx.playerHit = 0; fx.killsPending = 0;
}

// ---------------------------------------------------------------
// 스폰 / 제거 — 조밀 배열 + swap-remove
//   풀이 가득 차면 조용히 버린다. 예외를 던지지 않는다 (TDD §4.3)
// ---------------------------------------------------------------

export function spawnEnemy(w: World, defId: number, x: number, y: number, hp: number): number {
  if (w.eCount >= MAX_ENEMIES) return -1;
  const i = w.eCount++;
  w.eX[i] = x; w.eY[i] = y; w.eVX[i] = 0; w.eVY[i] = 0;
  w.eHp[i] = hp; w.eDefId[i] = defId; w.eFlags[i] = 1;
  w.eFlash[i] = 0; w.eKbX[i] = 0; w.eKbY[i] = 0; w.eContactCd[i] = 0;
  w.eGen[i] = (w.eGen[i]! + 1) & 0xffff;
  return i;
}

export function removeEnemy(w: World, i: number): void {
  const last = --w.eCount;
  if (i !== last) {
    w.eX[i] = w.eX[last]!; w.eY[i] = w.eY[last]!;
    w.eVX[i] = w.eVX[last]!; w.eVY[i] = w.eVY[last]!;
    w.eHp[i] = w.eHp[last]!; w.eDefId[i] = w.eDefId[last]!;
    w.eFlags[i] = w.eFlags[last]!; w.eGen[i] = w.eGen[last]!;
    w.eFlash[i] = w.eFlash[last]!;
    w.eKbX[i] = w.eKbX[last]!; w.eKbY[i] = w.eKbY[last]!;
    w.eContactCd[i] = w.eContactCd[last]!;
  }
}

/** 투사체 이동 방식 */
export const enum ProjKind {
  Straight = 0,
  /** 일정 프레임 뒤 플레이어에게 되돌아온다 */
  Boomerang = 1,
  /** 플레이어 주위를 공전한다 */
  Orbit = 2,
}

export function spawnProjectile(
  w: World, x: number, y: number, vx: number, vy: number,
  life: number, pierce: number, damage: number,
  kind: ProjKind = ProjKind.Straight,
): void {
  if (w.pCount >= MAX_PROJECTILES) return;
  const i = w.pCount++;
  w.pX[i] = x; w.pY[i] = y; w.pVX[i] = vx; w.pVY[i] = vy;
  w.pLife[i] = life; w.pPierce[i] = pierce; w.pDamage[i] = damage;
  w.pKind[i] = kind; w.pAge[i] = 0; w.pHitCd[i] = 0;
  w.pAngle[i] = 0; w.pOmega[i] = 0; w.pOrbitR[i] = 0;
}

/** 궤도 투사체 — 플레이어를 중심으로 공전한다 */
export function spawnOrbit(
  w: World, angle: number, omega: number, radius: number,
  life: number, damage: number,
): void {
  if (w.pCount >= MAX_PROJECTILES) return;
  const i = w.pCount++;
  w.pX[i] = w.player.x; w.pY[i] = w.player.y; w.pVX[i] = 0; w.pVY[i] = 0;
  w.pLife[i] = life; w.pPierce[i] = -1; w.pDamage[i] = damage;
  w.pKind[i] = ProjKind.Orbit; w.pAge[i] = 0; w.pHitCd[i] = 0;
  w.pAngle[i] = angle; w.pOmega[i] = omega; w.pOrbitR[i] = radius;
}

/** 장판 표시 방식 */
export const enum ZoneStyle {
  /** 바닥에 남는 자국 — 오래 남으므로 은은해야 한다 */
  Trail = 0,
  /** 순간 폭발 — 짧고 밝게 */
  Burst = 1,
}

export function spawnZone(
  w: World, x: number, y: number, radius: number, damage: number, life: number,
  style: ZoneStyle = ZoneStyle.Trail,
): void {
  if (w.zCount >= MAX_ZONES) return;
  const i = w.zCount++;
  w.zX[i] = x; w.zY[i] = y; w.zRadius[i] = radius;
  w.zDamage[i] = damage; w.zLife[i] = life; w.zAge[i] = 0;
  w.zMaxLife[i] = life; w.zStyle[i] = style;
}

export function removeZone(w: World, i: number): void {
  const last = --w.zCount;
  if (i !== last) {
    w.zX[i] = w.zX[last]!; w.zY[i] = w.zY[last]!;
    w.zRadius[i] = w.zRadius[last]!; w.zDamage[i] = w.zDamage[last]!;
    w.zLife[i] = w.zLife[last]!; w.zAge[i] = w.zAge[last]!;
    w.zMaxLife[i] = w.zMaxLife[last]!; w.zStyle[i] = w.zStyle[last]!;
  }
}

export function removeProjectile(w: World, i: number): void {
  const last = --w.pCount;
  if (i !== last) {
    w.pX[i] = w.pX[last]!; w.pY[i] = w.pY[last]!;
    w.pVX[i] = w.pVX[last]!; w.pVY[i] = w.pVY[last]!;
    w.pLife[i] = w.pLife[last]!; w.pPierce[i] = w.pPierce[last]!;
    w.pDamage[i] = w.pDamage[last]!;
    w.pKind[i] = w.pKind[last]!; w.pAge[i] = w.pAge[last]!;
    w.pAngle[i] = w.pAngle[last]!; w.pOmega[i] = w.pOmega[last]!;
    w.pOrbitR[i] = w.pOrbitR[last]!; w.pHitCd[i] = w.pHitCd[last]!;
  }
}

export function spawnGem(w: World, x: number, y: number, value: number): void {
  if (w.gCount >= MAX_GEMS) return;
  const i = w.gCount++;
  w.gX[i] = x; w.gY[i] = y; w.gValue[i] = value;
}

export function removeGem(w: World, i: number): void {
  const last = --w.gCount;
  if (i !== last) {
    w.gX[i] = w.gX[last]!; w.gY[i] = w.gY[last]!; w.gValue[i] = w.gValue[last]!;
  }
}
