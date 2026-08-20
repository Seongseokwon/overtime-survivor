import type { World } from '../ecs/world';
import { CELL, GRID_COLS, GRID_ROWS, CELL_CAPACITY } from '../core/constants';

const SEP_R2 = 196;   // 14u
const SEP_STRENGTH = 0.035;

/**
 * 적끼리 밀어내기. 전수 계산하지 않고 인접 4셀만, 2프레임에 1회 (TDD §6).
 * 적 500기에서 완벽한 분리는 필요 없다 — "겹쳐 보이지 않을 정도"면 된다.
 */
export function enemySeparation(w: World): void {
  if ((w.frame & 1) !== 0) return;
  for (let i = 0; i < w.eCount; i++) {
    const cx = (w.eX[i]! / CELL) | 0;
    const cy = (w.eY[i]! / CELL) | 0;
    if (cx < 0 || cy < 0 || cx >= GRID_COLS || cy >= GRID_ROWS) continue;
    let sx = 0, sy = 0;
    for (let oy = 0; oy <= 1; oy++) {
      const ny = cy + oy;
      if (ny >= GRID_ROWS) continue;
      for (let ox = 0; ox <= 1; ox++) {
        const nx = cx + ox;
        if (nx >= GRID_COLS) continue;
        const c = ny * GRID_COLS + nx;
        const n = w.cellCount[c]!;
        const base = c * CELL_CAPACITY;
        for (let k = 0; k < n; k++) {
          const j = w.cellStore[base + k]!;
          if (j === i) continue;
          const dx = w.eX[i]! - w.eX[j]!;
          const dy = w.eY[i]! - w.eY[j]!;
          const d2 = dx * dx + dy * dy;
          if (d2 > 0.01 && d2 < SEP_R2) {
            const weight = (SEP_R2 - d2) / SEP_R2;
            sx += dx * weight; sy += dy * weight;
          }
        }
      }
    }
    w.eX[i] = w.eX[i]! + sx * SEP_STRENGTH;
    w.eY[i] = w.eY[i]! + sy * SEP_STRENGTH;
  }
}
