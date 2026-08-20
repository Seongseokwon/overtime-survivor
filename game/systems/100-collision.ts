import type { World } from '../ecs/world';
import { removeProjectile, spawnGem } from '../ecs/world';
import { CELL, GRID_COLS, GRID_ROWS, CELL_CAPACITY, PLAYER_RADIUS } from '../core/constants';

const HIT_R2 = 169; // (적 7u + 투사체 6u)^2

/**
 * 투사체↔적, 적↔플레이어 충돌.
 * 원-원 판정만 쓴다. dx*dx + dy*dy < r*r 한 줄이면 끝나고,
 * 32px 스프라이트에서는 충분히 정확하다 (TDD §6).
 */
export function collision(w: World): void {
  w.removeN = 0;

  for (let i = w.pCount - 1; i >= 0; i--) {
    const cx = (w.pX[i]! / CELL) | 0;
    const cy = (w.pY[i]! / CELL) | 0;
    if (cx < 0 || cy < 0 || cx >= GRID_COLS || cy >= GRID_ROWS) continue;

    let consumed = false;
    for (let oy = -1; oy <= 1 && !consumed; oy++) {
      const ny = cy + oy;
      if (ny < 0 || ny >= GRID_ROWS) continue;
      for (let ox = -1; ox <= 1 && !consumed; ox++) {
        const nx = cx + ox;
        if (nx < 0 || nx >= GRID_COLS) continue;
        const c = ny * GRID_COLS + nx;
        const n = w.cellCount[c]!;
        const base = c * CELL_CAPACITY;
        for (let k = 0; k < n; k++) {
          const j = w.cellStore[base + k]!;
          if (j >= w.eCount || w.eHp[j]! <= 0) continue;
          const dx = w.pX[i]! - w.eX[j]!;
          const dy = w.pY[i]! - w.eY[j]!;
          if (dx * dx + dy * dy >= HIT_R2) continue;

          w.eHp[j] = w.eHp[j]! - w.pDamage[i]!;
          if (w.eHp[j]! <= 0) {
            const def = w.content.enemies[w.eDefId[j]!]!;
            spawnGem(w, w.eX[j]!, w.eY[j]!, def.drops.gemValue);
            w.removeBuf[w.removeN++] = j;
            w.killCount++;
          }
          const pierce = w.pPierce[i]! - 1;
          w.pPierce[i] = pierce;
          if (pierce <= 0) { removeProjectile(w, i); consumed = true; break; }
        }
      }
    }
  }
}

/** 적↔플레이어 접촉 피해 */
export function playerDamage(w: World): void {
  const pr2 = (PLAYER_RADIUS + 7) * (PLAYER_RADIUS + 7);
  for (let i = 0; i < w.eCount; i++) {
    if (w.eHp[i]! <= 0) continue;
    const dx = w.eX[i]! - w.player.x;
    const dy = w.eY[i]! - w.player.y;
    if (dx * dx + dy * dy < pr2) {
      const def = w.content.enemies[w.eDefId[i]!]!;
      // 프레임당 피해로 환산 (접촉 무적은 M2에서 개체별 타이머로 구현)
      w.player.hp -= def.contactDamage / def.contactCooldown;
    }
  }
  if (w.player.hp < 0) w.player.hp = 0;
}
