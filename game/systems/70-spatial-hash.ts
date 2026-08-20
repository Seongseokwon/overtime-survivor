import type { World } from '../ecs/world';
import { CELL, GRID_COLS, GRID_ROWS, CELL_CAPACITY } from '../core/constants';

/**
 * 균일 공간 해시 그리드 재구축 (TDD §6)
 * 이동 뒤, 충돌 전에 호출한다. 순서가 바뀌면 빠른 투사체가 적을 통과한다.
 */
export function rebuildSpatialHash(w: World): void {
  w.cellCount.fill(0);
  for (let i = 0; i < w.eCount; i++) {
    const cx = (w.eX[i]! / CELL) | 0;
    const cy = (w.eY[i]! / CELL) | 0;
    if (cx < 0 || cy < 0 || cx >= GRID_COLS || cy >= GRID_ROWS) continue;
    const c = cy * GRID_COLS + cx;
    const n = w.cellCount[c]!;
    if (n < CELL_CAPACITY) {
      w.cellStore[c * CELL_CAPACITY + n] = i;
      w.cellCount[c] = n + 1;
    }
  }
}
