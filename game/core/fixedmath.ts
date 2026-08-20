/**
 * 결정론 수학 (TDD §1.3)
 *
 * ECMAScript 명세는 Math.sin/cos/tan/atan2/pow/exp/log 를 "구현 근사"로 둔다.
 * V8 / JavaScriptCore / SpiderMonkey 가 서로 다른 최하위 비트를 낼 수 있고,
 * 한 번의 ULP 차이가 8분 뒤 완전히 다른 게임 상태를 만든다.
 * 따라서 시뮬레이션은 이 파일의 구현만 사용한다.
 *
 * 반면 사칙연산과 Math.sqrt 는 IEEE 754 가 결과를 정확히 규정하므로 안전하다.
 */

const SIN_BITS = 12;
const SIN_SIZE = 1 << SIN_BITS; // 4096
const SIN_MASK = SIN_SIZE - 1;

export const PI = 3.141592653589793;
export const TAU = 6.283185307179586;
const SIN_SCALE = SIN_SIZE / TAU;

/**
 * 빌드 타임이 아니라 모듈 로드 시 1회 생성한다.
 * Math.sin 의 구현 차이가 테이블에 스며들 수 있으므로, 엄밀히 하려면
 * 이 테이블을 사전 계산해 상수로 박아야 한다. → M2 과제 (tools/gen-sintable.ts)
 * 현 단계에서도 "한 프로세스 안에서는 항상 동일"이 보장되므로 결정론 테스트는 유효하다.
 */
const SIN_TABLE = new Float64Array(SIN_SIZE + 1);
for (let i = 0; i <= SIN_SIZE; i++) SIN_TABLE[i] = Math.sin((i / SIN_SIZE) * TAU);

export function dSin(radians: number): number {
  const f = radians * SIN_SCALE;
  const i = Math.floor(f);
  const t = f - i;
  const i0 = i & SIN_MASK;
  const a = SIN_TABLE[i0]!;
  const b = SIN_TABLE[i0 + 1]!;
  return a + (b - a) * t;
}

export function dCos(radians: number): number {
  return dSin(radians + PI / 2);
}

/** IEEE 754 가 정확히 규정 — 안전하다 */
export function dSqrt(v: number): number {
  return Math.sqrt(v);
}

export function dLen(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

/** atan2 다항식 근사 (최대 오차 ~0.0015 rad). 전 플랫폼 동일. */
export function dAtan2(y: number, x: number): number {
  if (x === 0 && y === 0) return 0;
  const ax = x < 0 ? -x : x;
  const ay = y < 0 ? -y : y;
  const a = (ax < ay ? ax / ay : ay / ax);
  const s = a * a;
  let r = ((-0.0464964749 * s + 0.15931422) * s - 0.327622764) * s * a + a;
  if (ay > ax) r = PI / 2 - r;
  if (x < 0) r = PI - r;
  if (y < 0) r = -r;
  return r;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
