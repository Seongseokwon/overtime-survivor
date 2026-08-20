import type { World } from '../ecs/world';
import { removeProjectile } from '../ecs/world';
import { WORLD_W, WORLD_H } from '../core/constants';

export function projectileMovement(w: World): void {
  for (let i = w.pCount - 1; i >= 0; i--) {
    w.pX[i] = w.pX[i]! + w.pVX[i]!;
    w.pY[i] = w.pY[i]! + w.pVY[i]!;
    const life = w.pLife[i]! - 1;
    w.pLife[i] = life;
    if (life === 0 || w.pX[i]! < 0 || w.pY[i]! < 0 || w.pX[i]! > WORLD_W || w.pY[i]! > WORLD_H) {
      removeProjectile(w, i);
    }
  }
}
