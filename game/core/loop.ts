/**
 * 고정 타임스텝 루프 (TDD §1.1)
 *
 * world.step 은 dt 를 받지 않는다. 프레임이 곧 시간 단위다.
 * 이 파일은 rAF/performance 를 쓰므로 브라우저 전용이며,
 * 시뮬레이션 코어(game/core 의 나머지)와 달리 Node 에서 실행되지 않는다.
 */
import { FIXED_DT_MS, MAX_CATCHUP_STEPS } from './constants';

export interface LoopStats {
  /** 이번 프레임에 실행된 시뮬 스텝 수 */
  steps: number;
  /**
   * 한 프레임에 스텝이 2번 이상 돈 횟수 — 체감 버벅임의 직접 지표.
   * (0스텝 프레임은 120Hz 디스플레이에서 정상이므로 세지 않는다)
   */
  hitches: number;
  frames: number;
}

export interface LoopCallbacks {
  step(): void;
  render(): void;
  onSample?(frameMs: number, stats: LoopStats): void;
}

/**
 * rAF 타임스탬프 스냅.
 *
 * 60Hz 디스플레이에서 delta 는 16.6~16.8ms 사이를 오간다. 이걸 그대로 누적하면
 * 어떤 프레임은 스텝이 0번, 다음 프레임은 2번 돌게 된다. 논리적으로는 시간이
 * 맞지만 화면에는 "한 프레임 멈췄다가 두 배로 튀는" 것으로 보인다.
 * 이것이 고정 타임스텝 게임에서 가장 흔한 미세 버벅임의 원인이다.
 *
 * delta 가 고정 스텝의 정수배에 충분히 가까우면 정확히 그 값으로 스냅해
 * 매 프레임 정확히 한 번씩(또는 정확히 n번씩) 돌게 만든다.
 */
const SNAP_TOLERANCE_MS = 1.5;

function snapDelta(delta: number): number {
  const steps = Math.round(delta / FIXED_DT_MS);
  if (steps >= 1 && Math.abs(delta - steps * FIXED_DT_MS) < SNAP_TOLERANCE_MS) {
    return steps * FIXED_DT_MS;
  }
  return delta;
}

export function startLoop(cb: LoopCallbacks): () => void {
  let acc = 0;
  let prev = performance.now();
  let raf = 0;
  let stopped = false;
  const stats: LoopStats = { steps: 0, hitches: 0, frames: 0 };

  const frame = (now: number): void => {
    if (stopped) return;
    raf = requestAnimationFrame(frame);

    // 탭 비활성 복귀 시 폭주 방지
    const raw = Math.min(now - prev, 250);
    prev = now;
    acc += snapDelta(raw);

    let steps = 0;
    while (acc >= FIXED_DT_MS && steps < MAX_CATCHUP_STEPS) {
      cb.step();
      acc -= FIXED_DT_MS;
      steps++;
    }
    // 따라잡기를 포기하고 시간을 버린다. 로직상 건너뛴 프레임은 없으므로 결정론은 유지된다.
    if (steps === MAX_CATCHUP_STEPS) acc = 0;

    // 부동소수 누적 오차가 쌓여 스텝이 밀리는 것을 막는다
    if (acc < 0.0001) acc = 0;

    cb.render();

    stats.steps = steps;
    stats.frames++;
    if (steps >= 2) stats.hitches++;
    cb.onSample?.(raw, stats);
  };

  raf = requestAnimationFrame(frame);
  return () => { stopped = true; cancelAnimationFrame(raf); };
}
