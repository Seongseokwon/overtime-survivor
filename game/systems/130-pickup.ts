import type { World } from '../ecs/world';
import { removeGem } from '../ecs/world';

const MAGNET_SPEED = 3.2;
const ABSORB_R2 = 100;

export function pickup(w: World): void {
  const range2 = w.player.pickupRange * w.player.pickupRange;
  for (let i = w.gCount - 1; i >= 0; i--) {
    const dx = w.player.x - w.gX[i]!;
    const dy = w.player.y - w.gY[i]!;
    const d2 = dx * dx + dy * dy;
    if (d2 >= range2) continue;
    const inv = MAGNET_SPEED / Math.sqrt(d2 + 0.0001);
    w.gX[i] = w.gX[i]! + dx * inv;
    w.gY[i] = w.gY[i]! + dy * inv;
    if (d2 < ABSORB_R2) {
      w.player.xp += w.gValue[i]!;
      removeGem(w, i);
    }
  }
}
