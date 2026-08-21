import type { World } from '../ecs/world';
import { spawnProjectile, spawnOrbit, spawnZone, ProjKind, ZoneStyle } from '../ecs/world';
import { TAU, dCos, dSin, dAtan2 } from '../core/fixedmath';
import { RngStream } from '../core/rng';

/**
 * 무기 발사.
 *
 * FireMode 종류마다 여기에 케이스가 하나씩 있다. 스키마 주석에 적어둔 대로,
 * **데이터만으로 새 동작이 생기지는 않는다** — 새 발사 방식을 만들려면
 * 스키마에 종류를 추가하고 여기에 구현을 넣어야 한다.
 * 데이터가 하는 일은 "어떤 동작을 어떤 수치로 쓸지" 고르는 것뿐이다.
 */
export function weaponFire(w: World): void {
  for (let s = 0; s < w.weapons.length; s++) {
    const slot = w.weapons[s]!;
    if (slot.cooldown > 0) { slot.cooldown--; continue; }

    const def = w.content.weapons[slot.defIndex]!;
    const lv = def.levels[Math.min(slot.level, def.levels.length) - 1]!;
    const damage = lv.damage * w.player.damageMul;
    const mode = def.fireMode;

    switch (mode.kind) {
      case 'straight': {
        const angle = aimAtNearest(w);
        for (let i = 0; i < lv.count; i++) {
          const off = lv.count === 1 ? 0 : (i / (lv.count - 1) - 0.5) * mode.spreadRad * 2;
          const a = angle + off;
          spawnProjectile(w, w.player.x, w.player.y,
            dCos(a) * lv.projectileSpeed, dSin(a) * lv.projectileSpeed,
            lv.lifetimeFrames, lv.pierce, damage);
        }
        break;
      }

      case 'shotgun': {
        const angle = aimAtNearest(w);
        for (let i = 0; i < lv.count; i++) {
          const t = lv.count === 1 ? 0.5 : i / (lv.count - 1);
          const a = angle + (t - 0.5) * mode.arcRad;
          spawnProjectile(w, w.player.x, w.player.y,
            dCos(a) * lv.projectileSpeed, dSin(a) * lv.projectileSpeed,
            lv.lifetimeFrames, lv.pierce, damage);
        }
        break;
      }

      case 'boomerang': {
        // 조준 방향으로 던진다. 수명 절반이 지나면 스스로 돌아온다.
        const angle = aimAtNearest(w);
        for (let i = 0; i < lv.count; i++) {
          const a = angle + (lv.count === 1 ? 0 : (i / lv.count) * 0.9 - 0.45);
          spawnProjectile(w, w.player.x, w.player.y,
            dCos(a) * lv.projectileSpeed, dSin(a) * lv.projectileSpeed,
            lv.lifetimeFrames, lv.pierce, damage, ProjKind.Boomerang);
        }
        break;
      }

      case 'orbit': {
        // 균등 간격으로 배치해야 회전이 고르게 보인다.
        // 쿨다운이 수명보다 길어야 궤도가 겹쳐 쌓이지 않는다 (콘텐츠에서 보장).
        for (let i = 0; i < lv.count; i++) {
          const a = (i / lv.count) * TAU;
          spawnOrbit(w, a, mode.angularSpeed, mode.radius, lv.lifetimeFrames, damage);
        }
        break;
      }

      case 'trail': {
        // 지나간 자리에 흔적을 남긴다. 쿨다운이 곧 생성 간격이다.
        //
        // 단, 제자리에 서 있으면 같은 자리에 자국이 겹겹이 쌓인다.
        // 장판은 각자 독립적으로 틱을 돌리므로 그대로 두면 "가만히 서 있는 것"이
        // 최적 전략이 된다(DPS가 겹친 수만큼 곱해진다). 화면도 노란 덩어리가 된다.
        // 그래서 이미 가까이에 자국이 있으면 새로 만들지 않는다.
        if (!hasNearbyTrail(w, lv.radius)) {
          spawnZone(w, w.player.x, w.player.y, lv.radius, damage, lv.lifetimeFrames, ZoneStyle.Trail);
        }
        break;
      }

      case 'aoeSelf': {
        // 플레이어 주변이 통째로 피해 영역이 된다. 짧고 넓게.
        spawnZone(w, w.player.x, w.player.y, lv.radius, damage, lv.lifetimeFrames, ZoneStyle.Burst);
        break;
      }

      default: {
        // homing / aoeTarget / melee 는 아직 미구현이다.
        // 콘텐츠에서 쓰지 않으므로 조용히 넘어간다.
        break;
      }
    }

    slot.cooldown = Math.max(6, Math.round(lv.cooldownFrames * (1 - w.player.cooldownReduction)));
  }
}

/**
 * 플레이어 근처에 이미 자국이 있는가.
 * 반경의 60% 안에 있으면 "같은 자리"로 본다 — 걸어가면 새로 깔리고,
 * 서 있으면 안 깔린다.
 */
function hasNearbyTrail(w: World, radius: number): boolean {
  const minGap = radius * 0.6;
  const minGap2 = minGap * minGap;
  for (let i = 0; i < w.zCount; i++) {
    if (w.zStyle[i]! !== 0) continue;
    const dx = w.zX[i]! - w.player.x;
    const dy = w.zY[i]! - w.player.y;
    if (dx * dx + dy * dy < minGap2) return true;
  }
  return false;
}

/** 가장 가까운 적 방향. 적이 없으면 무작위 방향으로 쏜다. */
function aimAtNearest(w: World): number {
  let best = -1;
  let bestD2 = Infinity;
  for (let i = 0; i < w.eCount; i++) {
    const dx = w.eX[i]! - w.player.x;
    const dy = w.eY[i]! - w.player.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = i; }
  }
  if (best < 0) return w.rng.next(RngStream.Crit) * TAU;
  return dAtan2(w.eY[best]! - w.player.y, w.eX[best]! - w.player.x);
}
