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
import { zones } from './105-zones';
import { pickup } from './130-pickup';
import { levelUp } from './140-levelup';
import { statusEffects } from './160-status';
import { cleanup } from './170-cleanup';

/**
 * 월드를 정확히 한 프레임 전진시킨다.
 * dt 를 받지 않는다 — 프레임이 곧 시간 단위다 (TDD §1.1).
 */
/**
 * 한 프레임에 이만큼 처치되면 히트스톱을 건다.
 * 잡몹 하나마다 걸면 게임이 계속 끊기므로, "무리가 한 번에 터진" 순간만 잡는다.
 */
const HITSTOP_KILL_THRESHOLD = 8;
const HITSTOP_FRAMES = 2;
/**
 * 히트스톱 재발동 금지 구간.
 *
 * 후반부에는 한 프레임에 여러 마리가 죽는 일이 흔해진다. 그때마다 시간을
 * 멈추면 강조가 아니라 그냥 버벅임이 된다. 최소 간격을 둬서 "가끔 터진다"를 지킨다.
 */
const HITSTOP_COOLDOWN = 30;

export function stepWorld(w: World, input: InputFrame): void {
  // 카드 선택 대기 중에는 시뮬레이션이 멈춘다.
  if (w.pendingChoice) return;

  // 히트스톱: 화면을 흔드는 대신 시간을 멈춰 타격을 강조한다.
  // 시뮬 안에 있으므로 리플레이가 정확히 재현된다.
  if (w.hitstop > 0) { w.hitstop--; return; }

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
  zones(w);                   // 105  ← collision 이 removeN 을 초기화하므로 반드시 뒤에
  playerDamage(w);            // 110
  pickup(w);                  // 130
  levelUp(w);                 // 140
  statusEffects(w);           // 160
  cleanup(w);                 // 170

  if (w.hitstopCd > 0) w.hitstopCd--;
  else if (w.fx.killsThisFrame >= HITSTOP_KILL_THRESHOLD) {
    w.hitstop = HITSTOP_FRAMES;
    w.hitstopCd = HITSTOP_COOLDOWN;
  }
}
