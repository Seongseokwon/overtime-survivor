/**
 * 고정 타임스텝 루프 (TDD §1.1)
 *
 * world.step 은 dt 를 받지 않는다. 프레임이 곧 시간 단위다.
 * 이 파일은 rAF/performance 를 쓰므로 브라우저 전용이며,
 * 시뮬레이션 코어(game/core 의 나머지)와 달리 Node 에서 실행되지 않는다.
 */
import { FIXED_DT_MS, MAX_CATCHUP_STEPS } from './constants';

export interface LoopCallbacks {
  step(): void;
  render(): void;
  onSample?(frameMs: number, steps: number): void;
}

export function startLoop(cb: LoopCallbacks): () => void {
  let acc = 0;
  let prev = performance.now();
  let raf = 0;
  let stopped = false;

  const frame = (now: number): void => {
    if (stopped) return;
    raf = requestAnimationFrame(frame);

    // 탭 비활성 복귀 시 폭주 방지
    const delta = Math.min(now - prev, 250);
    prev = now;
    acc += delta;

    let steps = 0;
    while (acc >= FIXED_DT_MS && steps < MAX_CATCHUP_STEPS) {
      cb.step();
      acc -= FIXED_DT_MS;
      steps++;
    }
    // 따라잡기를 포기하고 시간을 버린다. 로직상 건너뛴 프레임은 없으므로 결정론은 유지된다.
    if (steps === MAX_CATCHUP_STEPS) acc = 0;

    cb.render();
    cb.onSample?.(delta, steps);
  };

  raf = requestAnimationFrame(frame);
  return () => { stopped = true; cancelAnimationFrame(raf); };
}
