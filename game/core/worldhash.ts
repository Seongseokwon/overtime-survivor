/**
 * 월드 해시 — FNV-1a (TDD §1.6)
 *
 * Cosmetic 스트림(파티클 등)은 의도적으로 제외한다.
 * 기기 성능에 따라 파티클 수가 달라져도 게임 결과가 흔들리면 안 되며,
 * 그러려면 애초에 해시에 들어가면 안 된다.
 */
import type { World } from '../ecs/world';

const f64 = new Float64Array(1);
const u32 = new Uint32Array(f64.buffer);

function foldFloat(h: number, v: number): number {
  f64[0] = v;
  h = Math.imul(h ^ u32[0]!, 16777619) >>> 0;
  h = Math.imul(h ^ u32[1]!, 16777619) >>> 0;
  return h;
}

function foldInt(h: number, v: number): number {
  return Math.imul(h ^ (v | 0), 16777619) >>> 0;
}

export function worldHash(w: World): number {
  let h = 2166136261 >>> 0;
  h = foldInt(h, w.frame);
  h = foldInt(h, w.characterIndex);
  h = foldInt(h, w.eCount);
  h = foldInt(h, w.pCount);
  h = foldInt(h, w.gCount);
  h = foldInt(h, w.killCount);
  h = foldInt(h, w.player.level);
  h = foldFloat(h, w.player.x);
  h = foldFloat(h, w.player.y);
  h = foldFloat(h, w.player.hp);
  h = foldFloat(h, w.player.xp);
  h = foldFloat(h, w.player.payMultiplier);
  for (let i = 0; i < w.eCount; i++) {
    h = foldFloat(h, w.eX[i]!); h = foldFloat(h, w.eY[i]!); h = foldFloat(h, w.eHp[i]!);
  }
  for (let i = 0; i < w.pCount; i++) {
    h = foldFloat(h, w.pX[i]!); h = foldFloat(h, w.pY[i]!);
  }
  for (let i = 0; i < w.gCount; i++) {
    h = foldFloat(h, w.gX[i]!); h = foldFloat(h, w.gY[i]!);
  }
  return h >>> 0;
}
