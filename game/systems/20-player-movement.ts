import type { World } from '../ecs/world';
import { decodeDirection, type InputFrame } from '../input/InputFrame';
import { WORLD_W, WORLD_H, PLAYER_RADIUS } from '../core/constants';
import { clamp } from '../core/fixedmath';

const dir = { x: 0, y: 0 }; // 모듈 스코프 스크래치 — 핫 패스 할당 금지 (TDD §10)

export function playerMovement(w: World, input: InputFrame): void {
  if (decodeDirection(input, dir)) {
    const s = w.player.moveSpeed;
    w.player.x += dir.x * s;
    w.player.y += dir.y * s;
  }
  w.player.x = clamp(w.player.x, PLAYER_RADIUS, WORLD_W - PLAYER_RADIUS);
  w.player.y = clamp(w.player.y, PLAYER_RADIUS, WORLD_H - PLAYER_RADIUS);
}
