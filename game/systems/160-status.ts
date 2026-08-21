import type { World } from '../ecs/world';

const KNOCKBACK_DECAY = 0.78;
const KNOCKBACK_EPS = 0.02;

/**
 * 상태 타이머 감쇠 — 피격 플래시, 넉백, 접촉 쿨다운.
 * 화상·둔화·마킹 같은 실제 상태이상은 M2b에서 여기에 얹는다.
 */
export function statusEffects(w: World): void {
  for (let i = 0; i < w.eCount; i++) {
    if (w.eFlash[i]! > 0) w.eFlash[i] = w.eFlash[i]! - 1;
    if (w.eContactCd[i]! > 0) w.eContactCd[i] = w.eContactCd[i]! - 1;

    const kx = w.eKbX[i]!;
    const ky = w.eKbY[i]!;
    if (kx !== 0 || ky !== 0) {
      const nx = kx * KNOCKBACK_DECAY;
      const ny = ky * KNOCKBACK_DECAY;
      w.eKbX[i] = nx > -KNOCKBACK_EPS && nx < KNOCKBACK_EPS ? 0 : nx;
      w.eKbY[i] = ny > -KNOCKBACK_EPS && ny < KNOCKBACK_EPS ? 0 : ny;
    }
  }
}
