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
    // 넉백은 추적 속도에 더해진다. 밀려나는 동안에도 계속 다가오므로
    // 물량이 "밀렸다가 다시 몰려온다"는 압박감이 유지된다.
    w.eX[i] = w.eX[i]! + w.eVX[i]! + w.eKbX[i]!;
    w.eY[i] = w.eY[i]! + w.eVY[i]! + w.eKbY[i]!;
  }
}
