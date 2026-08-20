/**
 * 시드 PRNG — sfc32 (TDD §1.2)
 *
 * 용도별로 스트림을 분리한다. 하나를 공유하면 어느 한 시스템의
 * 난수 호출 횟수만 바뀌어도 나머지 전부의 결과가 달라지고,
 * 밸런스 패치 하나에 저장된 리플레이가 전부 깨진다.
 */

export const enum RngStream {
  Spawn = 0,
  Loot = 1,
  CardOffer = 2,
  Crit = 3,
  /** 시뮬 결과에 영향을 주지 않는다. 월드 해시에서 제외된다. */
  Cosmetic = 4,
}
export const RNG_STREAM_COUNT = 5;

export type Rng = () => number;

function sfc32(a: number, b: number, c: number, d: number): Rng {
  return function next(): number {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** 마스터 시드 + 스트림 id → 스트림 시드 (splitmix32 스타일 혼합) */
function mix(seed: number, stream: number): number {
  let h = (seed ^ Math.imul(stream + 1, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

export interface RngSet {
  readonly masterSeed: number;
  next(stream: RngStream): number;
  /** [0, n) 정수 */
  int(stream: RngStream, n: number): number;
  /** [lo, hi) 실수 */
  range(stream: RngStream, lo: number, hi: number): number;
}

export function createRngSet(masterSeed: number): RngSet {
  const streams: Rng[] = [];
  for (let s = 0; s < RNG_STREAM_COUNT; s++) {
    streams.push(sfc32(mix(masterSeed, s), mix(masterSeed, s + 101), mix(masterSeed, s + 211), 1));
  }
  return {
    masterSeed,
    next: (stream) => streams[stream]!(),
    int: (stream, n) => (streams[stream]!() * n) | 0,
    range: (stream, lo, hi) => lo + streams[stream]!() * (hi - lo),
  };
}
