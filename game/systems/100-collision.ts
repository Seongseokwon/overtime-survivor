import type { World } from '../ecs/world';
import { removeProjectile, spawnGem, fxDeath, fxSpark, ProjKind } from '../ecs/world';
import { CELL, GRID_COLS, GRID_ROWS, CELL_CAPACITY, PLAYER_RADIUS } from '../core/constants';
import { dSqrt } from '../core/fixedmath';

const HIT_R2 = 169; // (적 7u + 투사체 6u)^2
const FLASH_FRAMES = 4;
const KNOCKBACK = 1.6;
/** 궤도 무기가 같은 자리를 계속 때리지 않도록 하는 간격 */
const ORBIT_HIT_COOLDOWN = 10;

/**
 * 투사체↔적 충돌.
 * 원-원 판정만 쓴다. dx*dx + dy*dy < r*r 한 줄이면 끝나고,
 * 32px 스프라이트에서는 충분히 정확하다 (TDD §6).
 */
export function collision(w: World): void {
  w.removeN = 0;
  w.fx.killsThisFrame = 0;

  for (let i = w.pCount - 1; i >= 0; i--) {
    // 궤도처럼 오래 남는 투사체는 관통이 무제한이라, 재타격 쿨다운이 없으면
    // 같은 적을 매 프레임 때려 즉사시킨다.
    if (w.pHitCd[i]! > 0) continue;
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

          const dmg = w.pDamage[i]!;
          w.eHp[j] = w.eHp[j]! - dmg;

          // ── 타격 피드백 (카메라는 건드리지 않는다) ──
          w.eFlash[j] = FLASH_FRAMES;
          const def = w.content.enemies[w.eDefId[j]!]!;
          const resist = 1 - def.knockbackResist;
          if (resist > 0) {
            const speed = dSqrt(w.pVX[i]! * w.pVX[i]! + w.pVY[i]! * w.pVY[i]!);
            if (speed > 0.001) {
              w.eKbX[j] = w.eKbX[j]! + (w.pVX[i]! / speed) * KNOCKBACK * resist;
              w.eKbY[j] = w.eKbY[j]! + (w.pVY[i]! / speed) * KNOCKBACK * resist;
            }
          }
          fxSpark(w, w.pX[i]!, w.pY[i]!);

          if (w.eHp[j]! <= 0) {
            spawnGem(w, w.eX[j]!, w.eY[j]!, def.drops.gemValue);
            fxDeath(w, w.eX[j]!, w.eY[j]!, w.eDefId[j]!);
            w.removeBuf[w.removeN++] = j;
            w.killCount++;
            w.fx.killsThisFrame++;
            w.fx.killsPending++;
          }

          // 관통 무제한(-1)은 소모되지 않는다. 대신 재타격 쿨다운이 붙는다.
          if (w.pPierce[i]! < 0) {
            if (w.pKind[i] === ProjKind.Orbit) w.pHitCd[i] = ORBIT_HIT_COOLDOWN;
            consumed = true;
            break;
          }
          const pierce = w.pPierce[i]! - 1;
          w.pPierce[i] = pierce;
          if (pierce <= 0) { removeProjectile(w, i); consumed = true; break; }
        }
      }
    }
  }
}

/**
 * 적↔플레이어 접촉 피해.
 *
 * v1은 프레임당 `contactDamage / contactCooldown` 을 깎았는데, 그러면
 * 적 1마리에 스치면 거의 안 아프고 20마리에 둘러싸이면 순식간에 녹는다.
 * 위험이 "스칠 때 아픈" 게 아니라 "겹치면 즉사"가 되어, 적 무리 속에
 * 머물수록 보상을 주는 오버타임 게이지(PRD §4.5)와 정면으로 충돌한다.
 *
 * 그래서 개체별 쿨다운을 둔다. 한 마리는 자기 쿨다운마다 한 번씩만 때린다.
 */
export function playerDamage(w: World): void {
  const r = PLAYER_RADIUS + 7;
  const r2 = r * r;
  for (let i = 0; i < w.eCount; i++) {
    if (w.eHp[i]! <= 0) continue;
    if (w.eContactCd[i]! > 0) continue;
    const dx = w.eX[i]! - w.player.x;
    const dy = w.eY[i]! - w.player.y;
    if (dx * dx + dy * dy >= r2) continue;

    const def = w.content.enemies[w.eDefId[i]!]!;
    w.player.hp -= def.contactDamage;
    w.fx.playerHit += def.contactDamage;
    w.eContactCd[i] = Math.min(255, def.contactCooldown);
  }
  if (w.player.hp < 0) w.player.hp = 0;
}
