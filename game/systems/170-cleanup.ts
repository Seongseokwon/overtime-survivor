import type { World } from '../ecs/world';
import { removeEnemy } from '../ecs/world';

/**
 * 제거 목록 일괄 처리.
 * swap-remove 는 순회 중 인덱스를 흔들기 때문에, 반드시 인덱스
 * 내림차순으로 처리해야 한다 (TDD §1.4).
 */
export function cleanup(w: World): void {
  if (w.removeN === 0) return;
  const buf = w.removeBuf.subarray(0, w.removeN);
  buf.sort();                       // TypedArray.sort 는 수치 오름차순, 안정적
  let prev = -1;
  for (let k = w.removeN - 1; k >= 0; k--) {
    const idx = buf[k]!;
    if (idx === prev) continue;     // 같은 프레임 중복 처치 방어
    prev = idx;
    if (idx < w.eCount) removeEnemy(w, idx);
  }
  w.removeN = 0;
}
