/**
 * 입력 프레임 인코딩 (TDD §7.1)
 *
 *   bit 0-7   이동 방향 (256분할 각도, 255 = 정지)
 *   bit 8     대시
 *   bit 9     일시정지 토글
 *   bit 10-15 예약
 */
import { TAU, dCos, dSin } from '../core/fixedmath';

export type InputFrame = number;

export const INPUT_IDLE: InputFrame = 255;

export const DIR_NONE = 255;
export const BIT_DASH = 1 << 8;
export const BIT_PAUSE = 1 << 9;

/** 정규화된 방향 벡터를 256분할 각도로 양자화한다. */
export function encodeDirection(dx: number, dy: number): number {
  if (dx === 0 && dy === 0) return DIR_NONE;
  // atan2 대신 사분면 판정 + 테이블 탐색을 쓰지 않고, 여기서는 단순 양자화로 충분하다.
  // 입력은 어차피 8방향(키보드) 또는 조이스틱 각도이므로 정밀도 손실이 게임에 영향 없다.
  let a = Math.atan2(dy, dx); // ⚠ 입력 계층은 시뮬 밖이므로 Math 사용 허용
  if (a < 0) a += TAU;
  const q = Math.round((a / TAU) * 256) & 0xff;
  return q === DIR_NONE ? 0 : q;
}

/** 시뮬레이션 쪽에서 사용. 결정론 수학만 쓴다. */
export function decodeDirection(input: InputFrame, out: { x: number; y: number }): boolean {
  const d = input & 0xff;
  if (d === DIR_NONE) { out.x = 0; out.y = 0; return false; }
  const a = (d / 256) * TAU;
  out.x = dCos(a);
  out.y = dSin(a);
  return true;
}

export function hasDash(input: InputFrame): boolean {
  return (input & BIT_DASH) !== 0;
}
