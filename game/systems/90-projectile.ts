import type { World } from '../ecs/world';
import { removeProjectile, ProjKind } from '../ecs/world';
import { WORLD_W, WORLD_H } from '../core/constants';
import { dCos, dSin, dSqrt } from '../core/fixedmath';

/** 부메랑이 되돌아오기 시작하는 시점 (수명의 절반) */
const BOOMERANG_TURN = 0.5;
const BOOMERANG_PULL = 0.35;

export function projectileMovement(w: World): void {
  for (let i = w.pCount - 1; i >= 0; i--) {
    if (w.pHitCd[i]! > 0) w.pHitCd[i] = w.pHitCd[i]! - 1;
    w.pAge[i] = w.pAge[i]! + 1;

    switch (w.pKind[i]!) {
      case ProjKind.Orbit: {
        // 플레이어를 따라다니며 공전한다. 위치는 매 프레임 새로 계산하므로
        // 플레이어가 움직여도 궤도가 끌려오지 않고 정확히 붙어 있다.
        const a = w.pAngle[i]! + w.pOmega[i]!;
        w.pAngle[i] = a;
        w.pX[i] = w.player.x + dCos(a) * w.pOrbitR[i]!;
        w.pY[i] = w.player.y + dSin(a) * w.pOrbitR[i]!;
        break;
      }
      case ProjKind.Boomerang: {
        // 수명 절반이 지나면 플레이어 쪽으로 가속해 돌아온다
        const turnAt = w.pLife[i]! + w.pAge[i]!; // 남은 수명 + 나이 = 총 수명
        if (w.pAge[i]! > turnAt * BOOMERANG_TURN) {
          const dx = w.player.x - w.pX[i]!;
          const dy = w.player.y - w.pY[i]!;
          const d = dSqrt(dx * dx + dy * dy);
          if (d > 0.001) {
            w.pVX[i] = w.pVX[i]! + (dx / d) * BOOMERANG_PULL;
            w.pVY[i] = w.pVY[i]! + (dy / d) * BOOMERANG_PULL;
          }
          // 손에 돌아오면 사라진다
          if (d < 10) { removeProjectile(w, i); continue; }
        }
        w.pX[i] = w.pX[i]! + w.pVX[i]!;
        w.pY[i] = w.pY[i]! + w.pVY[i]!;
        break;
      }
      default: {
        w.pX[i] = w.pX[i]! + w.pVX[i]!;
        w.pY[i] = w.pY[i]! + w.pVY[i]!;
        break;
      }
    }

    const life = w.pLife[i]! - 1;
    w.pLife[i] = life;

    // 궤도는 플레이어를 따라다니므로 월드 경계로 지우지 않는다
    const outOfWorld = w.pKind[i] !== ProjKind.Orbit &&
      (w.pX[i]! < 0 || w.pY[i]! < 0 || w.pX[i]! > WORLD_W || w.pY[i]! > WORLD_H);
    if (life === 0 || outOfWorld) removeProjectile(w, i);
  }
}
