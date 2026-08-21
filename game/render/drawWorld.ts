/**
 * 월드 → 렌더러 그리기.
 * 이 파일은 render 계층에 속하므로 Renderer 인터페이스를 알아도 된다.
 * 반대로 game/systems 는 이 파일을 몰라야 한다.
 *
 * 레이어 순서 (TDD §8.1)
 *   0 바닥 → 1 바닥 장식 → 2 서 있는 장식 → 3 젬 → 4 적
 *   → 5 플레이어 → 6 투사체 → 7 파티클 → 8 데미지 팝업
 */
import type { World } from '../ecs/world';
import type { Renderer } from './Renderer';
import { FRAME_GEM, FRAME_PLAYER, FRAME_PROJECTILE } from './atlas';
import { forEachDecor } from './decor';
import { WORLD_W, WORLD_H } from '../core/constants';
import type { DamagePopups, ParticleField } from './effects';

export function drawWorld(
  w: World, r: Renderer, camX: number, camY: number, viewW: number, viewH: number,
  particles: ParticleField, popups: DamagePopups,
): void {
  r.beginFrame(camX, camY);
  r.drawBackground();

  const emit = (frame: number, x: number, y: number): void => r.drawSprite(frame, x, y, false);
  forEachDecor(camX, camY, viewW, viewH, WORLD_W, WORLD_H, true, emit);   // 바닥 얼룩
  forEachDecor(camX, camY, viewW, viewH, WORLD_W, WORLD_H, false, emit);  // 책상·파티션

  for (let i = 0; i < w.gCount; i++) r.drawSprite(FRAME_GEM, w.gX[i]!, w.gY[i]!, false);

  // 적: Y 정렬은 M2b에서 셀 행 버킷 카운팅 소트로 추가한다 (TDD §8.1)
  for (let i = 0; i < w.eCount; i++) {
    const flash = w.eFlash[i]!;
    const anim = ((w.frame >> 3) + i) & 3;
    // 맞은 직후 2프레임은 가로로 눌린다. 흰 플래시와 겹쳐 "맞았다"가 확실해진다.
    const squash = flash >= 3 ? 2 : 0;
    r.drawSprite(w.eDefId[i]! * 4 + anim, w.eX[i]!, w.eY[i]!, false, flash > 0, squash);
  }

  // 발사 반동 — 카메라가 아니라 플레이어 스프라이트만 밀린다
  r.drawSprite(FRAME_PLAYER, w.player.x + w.fx.recoilX, w.player.y + w.fx.recoilY, false);

  for (let i = 0; i < w.pCount; i++) r.drawSprite(FRAME_PROJECTILE, w.pX[i]!, w.pY[i]!, false);

  particles.draw(r);
  popups.draw(r);

  r.endFrame();
}
