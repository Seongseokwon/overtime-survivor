import type { World } from '../ecs/world';
import { removeZone, spawnGem, fxDeath, fxSpark } from '../ecs/world';
import { CELL, GRID_COLS, GRID_ROWS, CELL_CAPACITY } from '../core/constants';

/**
 * 장판 — 형광펜 자국, 커피 화상 같은 지속 피해 영역.
 *
 * 매 프레임 피해를 주면 수치가 미세하게 쪼개져 체감이 안 되고 비용도 크다.
 * 일정 주기로만 "틱"을 돌려 한 번에 눈에 보이는 만큼 깎는다.
 */
const ZONE_TICK = 12;

export function zones(w: World): void {
  for (let i = w.zCount - 1; i >= 0; i--) {
    const age = w.zAge[i]! + 1;
    w.zAge[i] = age;

    if (age % ZONE_TICK === 0) {
      damageInRadius(w, w.zX[i]!, w.zY[i]!, w.zRadius[i]!, w.zDamage[i]!);
    }

    const life = w.zLife[i]! - 1;
    w.zLife[i] = life;
    if (life <= 0) removeZone(w, i);
  }
}

/** 반경 안의 적에게 피해. 공간 해시로 후보를 좁힌다 (TDD §6). */
function damageInRadius(w: World, x: number, y: number, radius: number, damage: number): void {
  const r2 = (radius + 7) * (radius + 7);
  const cellR = Math.ceil((radius + 7) / CELL);
  const cx = (x / CELL) | 0;
  const cy = (y / CELL) | 0;

  for (let oy = -cellR; oy <= cellR; oy++) {
    const ny = cy + oy;
    if (ny < 0 || ny >= GRID_ROWS) continue;
    for (let ox = -cellR; ox <= cellR; ox++) {
      const nx = cx + ox;
      if (nx < 0 || nx >= GRID_COLS) continue;
      const c = ny * GRID_COLS + nx;
      const n = w.cellCount[c]!;
      const base = c * CELL_CAPACITY;
      for (let k = 0; k < n; k++) {
        const j = w.cellStore[base + k]!;
        if (j >= w.eCount || w.eHp[j]! <= 0) continue;
        const dx = w.eX[j]! - x;
        const dy = w.eY[j]! - y;
        if (dx * dx + dy * dy >= r2) continue;

        w.eHp[j] = w.eHp[j]! - damage;
        w.eFlash[j] = 3;
        if (w.eHp[j]! <= 0) {
          // 사망 처리는 충돌 시스템과 같은 경로를 쓴다 (제거 목록 → 170 cleanup).
          // 이 시스템은 반드시 collision(100) '뒤'에 돌아야 한다 —
          // collision 이 매 프레임 removeN 을 0으로 초기화하기 때문이다.
          const def = w.content.enemies[w.eDefId[j]!]!;
          spawnGem(w, w.eX[j]!, w.eY[j]!, def.drops.gemValue);
          fxDeath(w, w.eX[j]!, w.eY[j]!, w.eDefId[j]!);
          w.removeBuf[w.removeN++] = j;
          w.killCount++;
          w.fx.killsThisFrame++;
          w.fx.killsPending++;
        } else {
          fxSpark(w, w.eX[j]!, w.eY[j]!);
        }
      }
    }
  }
}
