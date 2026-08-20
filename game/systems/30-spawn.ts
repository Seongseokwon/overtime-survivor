import type { World } from '../ecs/world';
import { spawnEnemy } from '../ecs/world';
import { RngStream } from '../core/rng';
import { TAU, dCos, dSin, clamp } from '../core/fixedmath';
import { SPAWN_RING_MIN, SPAWN_RING_SPAN, WORLD_W, WORLD_H, FPS } from '../core/constants';

/**
 * 웨이브 디렉터 (PRD §4.3)
 * 콘텐츠의 SpawnEntry 곡선을 읽어 초당 스폰율을 선형 보간한다.
 * 누적 소수부를 월드에 두지 않고 프레임 기반으로 결정하기 위해,
 * "이번 프레임에 몇 마리"를 rate/60 의 확률로 판정한다 — 결정론적이다.
 */
export function spawnDirector(w: World): void {
  const stage = w.content.stages[0];
  if (!stage) return;
  const t = w.frame;

  for (let k = 0; k < stage.waves.entries.length; k++) {
    const e = stage.waves.entries[k]!;
    if (t < e.startFrame || t > e.endFrame) continue;
    if (w.eCount >= stage.waves.maxAlive) break;

    const span = e.endFrame - e.startFrame;
    const p = span > 0 ? (t - e.startFrame) / span : 0;
    const rate = e.startRatePerSec + (e.endRatePerSec - e.startRatePerSec) * p;
    const perFrame = rate / FPS;

    let n = Math.floor(perFrame);
    if (w.rng.next(RngStream.Spawn) < perFrame - n) n++;

    const defIndex = findEnemyIndex(w, e.enemyId);
    if (defIndex < 0) continue;
    const def = w.content.enemies[defIndex]!;

    for (let i = 0; i < n && w.eCount < stage.waves.maxAlive; i++) {
      const ang = w.rng.next(RngStream.Spawn) * TAU;
      const dist = SPAWN_RING_MIN + w.rng.next(RngStream.Spawn) * SPAWN_RING_SPAN;
      const x = clamp(w.player.x + dCos(ang) * dist, 8, WORLD_W - 8);
      const y = clamp(w.player.y + dSin(ang) * dist, 8, WORLD_H - 8);
      spawnEnemy(w, defIndex, x, y, def.hp);
    }
  }
}

function findEnemyIndex(w: World, id: string): number {
  for (let i = 0; i < w.content.enemies.length; i++) {
    if (w.content.enemies[i]!.id === id) return i;
  }
  return -1;
}
