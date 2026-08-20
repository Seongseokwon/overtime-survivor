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
  };
  return w;
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
