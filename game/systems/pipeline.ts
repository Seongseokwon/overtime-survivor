/**
 * 시스템 실행 순서 (TDD §5)
 *
 * 이 순서는 결정론과 게임 필(feel) 양쪽에 직결된다.
 * 바꾸면 ENGINE_VERSION 을 올리고 골든 리플레이를 갱신해야 한다.
 */
import type { World } from '../ecs/world';
import type { InputFrame } from '../input/InputFrame';

import { playerMovement } from './20-player-movement';
import { spawnDirector } from './30-spawn';
import { enemyAI, enemyMovement } from './40-enemy-ai';
import { enemySeparation } from './50-separation';
import { rebuildSpatialHash } from './70-spatial-hash';
import { weaponFire } from './80-weapon';
import { projectileMovement } from './90-projectile';
import { collision, playerDamage } from './100-collision';
import { pickup } from './130-pickup';
import { levelUp } from './140-levelup';
import { cleanup } from './170-cleanup';

/**
 * 월드를 정확히 한 프레임 전진시킨다.
 * dt 를 받지 않는다 — 프레임이 곧 시간 단위다 (TDD §1.1).
 */
export function stepWorld(w: World, input: InputFrame): void {
  // 카드 선택 대기 중에는 시뮬레이션이 멈춘다.
  if (w.pendingChoice) return;

  w.frame++;
  w.elapsedFrames++;

  playerMovement(w, input);   // 20
  spawnDirector(w);           // 30
  enemyAI(w);                 // 40
  enemyMovement(w);           // 60
  rebuildSpatialHash(w);      // 70  ← 이동 뒤, 충돌 전
  enemySeparation(w);         // 50  (그리드 필요)
  weaponFire(w);              // 80
  projectileMovement(w);      // 90
  collision(w);               // 100
  playerDamage(w);            // 110
  pickup(w);                  // 130
  levelUp(w);                 // 140
  cleanup(w);                 // 170
}
