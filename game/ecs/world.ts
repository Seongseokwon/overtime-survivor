/**
 * 월드 상태 — SoA (Structure of Arrays) (TDD §4)
 *
 * TDD 초안은 모듈 레벨 배열을 예시로 들었으나, 서버가 여러 리플레이를
 * 동시에 검증하려면 월드 인스턴스가 여러 개 필요하다. 따라서 팩토리로 만든다.
 * SoA·조밀 배열·swap-remove·고정 풀이라는 성질은 그대로다.
 */
import {
  MAX_ENEMIES, MAX_PROJECTILES, MAX_GEMS,
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
  dmgX: Float32Array; dmgY: Float32Array; dmgAmt: Float32Array; dmgN: number;
  /** 이번 소비 구간에 플레이어가 받은 총 피해 */
  playerHit: number;
  /** 발사 반동 방향 (플레이어 스프라이트만 밀린다. 카메라는 건드리지 않는다) */
  recoilX: number; recoilY: number;
  killsThisFrame: number;
  /** 소비 구간 누적 처치 수 — 효과음 빈도 조절용 */
  killsPending: number;
}

const FX_CAP = 256;

export interface World {
  frame: number;
  rng: RngSet;
  content: ContentPack;

  player: PlayerState;
  weapons: WeaponSlot[];

  /** 레벨업 카드 선택 대기 중이면 시뮬레이션이 멈춘다 (TDD §5, 시스템 140) */
  pendingChoice: number[] | null;

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
  pCount: number;

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

  fx: FxBuffer;
}

export function createWorld(seed: number, content: ContentPack): World {
  const w: World = {
    frame: 0,
    rng: createRngSet(seed),
    content,
    player: {
      x: WORLD_W / 2, y: WORLD_H / 2,
      hp: 100, maxHp: 100,
      moveSpeed: 100 / 60,      // 100 u/s
      damageMul: 1,
      cooldownReduction: 0,
      pickupRange: 60,
      level: 1, xp: 0, xpToNext: 5,
    },
    weapons: [],
    pendingChoice: null,

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
    pCount: 0,

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
    fx: {
      deathX: new Float32Array(FX_CAP), deathY: new Float32Array(FX_CAP),
      deathDef: new Uint8Array(FX_CAP), deathN: 0,
      sparkX: new Float32Array(FX_CAP), sparkY: new Float32Array(FX_CAP), sparkN: 0,
      dmgX: new Float32Array(FX_CAP), dmgY: new Float32Array(FX_CAP),
      dmgAmt: new Float32Array(FX_CAP), dmgN: 0,
      playerHit: 0, recoilX: 0, recoilY: 0,
      killsThisFrame: 0, killsPending: 0,
    },
  };
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

export function fxDamage(w: World, x: number, y: number, amount: number): void {
  const fx = w.fx;
  if (fx.dmgN >= FX_CAP) return;
  fx.dmgX[fx.dmgN] = x; fx.dmgY[fx.dmgN] = y; fx.dmgAmt[fx.dmgN] = amount;
  fx.dmgN++;
}

/** 렌더가 이벤트를 소비한 뒤 호출한다. */
export function clearFx(w: World): void {
  const fx = w.fx;
  fx.deathN = 0; fx.sparkN = 0; fx.dmgN = 0;
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

export function spawnProjectile(
  w: World, x: number, y: number, vx: number, vy: number,
  life: number, pierce: number, damage: number,
): void {
  if (w.pCount >= MAX_PROJECTILES) return;
  const i = w.pCount++;
  w.pX[i] = x; w.pY[i] = y; w.pVX[i] = vx; w.pVY[i] = vy;
  w.pLife[i] = life; w.pPierce[i] = pierce; w.pDamage[i] = damage;
}

export function removeProjectile(w: World, i: number): void {
  const last = --w.pCount;
  if (i !== last) {
    w.pX[i] = w.pX[last]!; w.pY[i] = w.pY[last]!;
    w.pVX[i] = w.pVX[last]!; w.pVY[i] = w.pVY[last]!;
    w.pLife[i] = w.pLife[last]!; w.pPierce[i] = w.pPierce[last]!;
    w.pDamage[i] = w.pDamage[last]!;
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
