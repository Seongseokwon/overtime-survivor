/**
 * 월드 → 렌더러 그리기.
 * 이 파일은 render 계층에 속하므로 Renderer 인터페이스를 알아도 된다.
 * 반대로 game/systems 는 이 파일을 몰라야 한다.
 *
 * 레이어 순서 (TDD §8.1)
 *   0 바닥 → 1 바닥 장식 → 2 서 있는 장식 → 3 장판 → 4 젬 → 5 적
 *   → 6 플레이어 → 7 투사체 → 8 파티클
 */
import type { World } from '../ecs/world';
import type { Renderer } from './Renderer';
import { FRAME_GEM, FRAME_PLAYER, FRAME_PROJECTILE } from './atlas';
import { forEachDecor } from './decor';
import { WORLD_W, WORLD_H } from '../core/constants';
import type { ParticleField } from './effects';

export function drawWorld(
  w: World, r: Renderer, camX: number, camY: number, viewW: number, viewH: number,
  particles: ParticleField,
): void {
  r.beginFrame(camX, camY);
  r.drawBackground();

  const emit = (frame: number, x: number, y: number): void => r.drawSprite(frame, x, y, false);
  forEachDecor(camX, camY, viewW, viewH, WORLD_W, WORLD_H, true, emit);   // 바닥 얼룩
  forEachDecor(camX, camY, viewW, viewH, WORLD_W, WORLD_H, false, emit);  // 책상·파티션

  // 장판은 적 아래에 깔린다.
  //  - 자국(Trail)은 겹쳐 쌓이므로 아주 옅어야 한다. 안 그러면 플레이어 주변이
  //    노란 덩어리가 되어 적이 안 보인다.
  //  - 폭발(Burst)은 한 번에 하나뿐이라 밝게 터뜨려도 된다.
  for (let i = 0; i < w.zCount; i++) {
    const life = w.zMaxLife[i]! > 0 ? w.zLife[i]! / w.zMaxLife[i]! : 0;
    const burst = w.zStyle[i]! === 1;
    const alpha = burst ? 0.10 + life * 0.30 : 0.06 + life * 0.13;
    const color = burst ? 9 : 10;
    r.drawCircle(w.zX[i]!, w.zY[i]!, w.zRadius[i]!, color, alpha);
  }

  for (let i = 0; i < w.gCount; i++) r.drawSprite(FRAME_GEM, w.gX[i]!, w.gY[i]!, false);

  // 적: Y 정렬은 M2b에서 셀 행 버킷 카운팅 소트로 추가한다 (TDD §8.1)
  for (let i = 0; i < w.eCount; i++) {
    const flash = w.eFlash[i]!;
    const anim = ((w.frame >> 3) + i) & 3;
    // 맞은 직후 2프레임은 가로로 눌린다. 흰 플래시와 겹쳐 "맞았다"가 확실해진다.
    const squash = flash >= 3 ? 2 : 0;
    r.drawSprite(w.eDefId[i]! * 4 + anim, w.eX[i]!, w.eY[i]!, false, flash > 0, squash);
  }

  r.drawSprite(FRAME_PLAYER, w.player.x, w.player.y, false);

  for (let i = 0; i < w.pCount; i++) r.drawSprite(FRAME_PROJECTILE, w.pX[i]!, w.pY[i]!, false);

  particles.draw(r);

  r.endFrame();
}
