import type { World } from '../ecs/world';
import { spawnProjectile } from '../ecs/world';
import { TAU, dCos, dSin } from '../core/fixedmath';
import { RngStream } from '../core/rng';

/**
 * 무기 발사. 현 단계는 straight / shotgun 두 가지만 처리한다.
 * FireMode 를 늘릴 때는 여기에 케이스를 추가한다 — 데이터만으로
 * 새 동작이 생기지 않는다는 점이 스키마 주석에 명시돼 있다.
 */
export function weaponFire(w: World): void {
  for (let s = 0; s < w.weapons.length; s++) {
    const slot = w.weapons[s]!;
    if (slot.cooldown > 0) { slot.cooldown--; continue; }

    const def = w.content.weapons[slot.defIndex]!;
    const lv = def.levels[Math.min(slot.level, def.levels.length) - 1]!;
    const damage = lv.damage * w.player.damageMul;

    switch (def.fireMode.kind) {
      case 'straight': {
        // 가장 가까운 적 방향으로 발사 (조준 무기가 없는 단계의 기본 동작)
        const angle = aimAtNearest(w);
        const spread = def.fireMode.spreadRad;
        for (let i = 0; i < lv.count; i++) {
          const off = lv.count === 1 ? 0 : (i / (lv.count - 1) - 0.5) * spread * 2;
          const a = angle + off;
          spawnProjectile(w, w.player.x, w.player.y,
            dCos(a) * lv.projectileSpeed, dSin(a) * lv.projectileSpeed,
            lv.lifetimeFrames, lv.pierce, damage);
        }
        break;
      }
      case 'shotgun': {
        const angle = aimAtNearest(w);
        const arc = def.fireMode.arcRad;
        for (let i = 0; i < lv.count; i++) {
          const t = lv.count === 1 ? 0.5 : i / (lv.count - 1);
          const a = angle + (t - 0.5) * arc;
          spawnProjectile(w, w.player.x, w.player.y,
            dCos(a) * lv.projectileSpeed, dSin(a) * lv.projectileSpeed,
            lv.lifetimeFrames, lv.pierce, damage);
        }
        break;
      }
      default: {
        // 미구현 발사 방식은 조용히 건너뛴다 (M2에서 확장)
        break;
      }
    }

    const cd = Math.max(6, Math.round(lv.cooldownFrames * (1 - w.player.cooldownReduction)));
    slot.cooldown = cd;
  }
}

function aimAtNearest(w: World): number {
  let best = -1, bestD2 = Infinity;
  for (let i = 0; i < w.eCount; i++) {
    const dx = w.eX[i]! - w.player.x, dy = w.eY[i]! - w.player.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = i; }
  }
  if (best < 0) return w.rng.next(RngStream.Crit) * TAU;
  const dx = w.eX[best]! - w.player.x, dy = w.eY[best]! - w.player.y;
  // 결정론 atan2
  return atan2Det(dy, dx);
}

import { dAtan2 } from '../core/fixedmath';
function atan2Det(y: number, x: number): number { return dAtan2(y, x); }
