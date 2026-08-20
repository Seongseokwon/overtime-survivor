import type { World } from '../ecs/world';

/** 잡몹 추적 이동. 원거리·돌진 행동은 M2에서 확장한다. */
export function enemyAI(w: World): void {
  const px = w.player.x, py = w.player.y;
  for (let i = 0; i < w.eCount; i++) {
    const def = w.content.enemies[w.eDefId[i]!]!;
    const dx = px - w.eX[i]!, dy = py - w.eY[i]!;
    const d2 = dx * dx + dy * dy;
    if (d2 > 1) {
      const inv = def.speed / Math.sqrt(d2);
      w.eVX[i] = dx * inv;
      w.eVY[i] = dy * inv;
    } else {
      w.eVX[i] = 0; w.eVY[i] = 0;
    }
  }
}

export function enemyMovement(w: World): void {
  for (let i = 0; i < w.eCount; i++) {
    w.eX[i] = w.eX[i]! + w.eVX[i]!;
    w.eY[i] = w.eY[i]! + w.eVY[i]!;
  }
}
