/**
 * 월드 → 렌더러 그리기.
 * 이 파일은 render 계층에 속하므로 Renderer 인터페이스를 알아도 된다.
 * 반대로 game/systems 는 이 파일을 몰라야 한다.
 */
import type { World } from '../ecs/world';
import type { Renderer } from './Renderer';
import { FRAME_GEM, FRAME_PLAYER, FRAME_PROJECTILE } from './atlas';

export function drawWorld(w: World, r: Renderer, camX: number, camY: number): void {
  r.beginFrame(camX, camY);
  r.drawBackground();

  for (let i = 0; i < w.gCount; i++) r.drawSprite(FRAME_GEM, w.gX[i]!, w.gY[i]!, false);

  // 적: Y 정렬은 M2에서 셀 행 버킷 카운팅 소트로 추가한다 (TDD §8.1)
  for (let i = 0; i < w.eCount; i++) {
    const anim = ((w.frame >> 3) + i) & 3;
    r.drawSprite(w.eDefId[i]! * 4 + anim, w.eX[i]!, w.eY[i]!, false);
  }

  r.drawSprite(FRAME_PLAYER, w.player.x, w.player.y, false);

  for (let i = 0; i < w.pCount; i++) r.drawSprite(FRAME_PROJECTILE, w.pX[i]!, w.pY[i]!, false);

  r.endFrame();
}
