/** 구조적 상수. 밸런스 수치는 여기가 아니라 game/content 에 둔다. (TDD §10) */

// --- 시간 (TDD §1.1) ---
export const FPS = 60;
export const FIXED_DT_MS = 1000 / 60;
export const MAX_CATCHUP_STEPS = 5;
export const sec = (s: number): number => Math.round(s * FPS);

// --- 좌표계 (TDD §2) ---
export const VIEW_W_LANDSCAPE = 480;
export const VIEW_H_LANDSCAPE = 270;
export const VIEW_W_PORTRAIT = 270;
export const VIEW_H_PORTRAIT = 480;

export const WORLD_W = 2560;
export const WORLD_H = 1440;

export const CELL = 64;
export const GRID_COLS = Math.ceil(WORLD_W / CELL);
export const GRID_ROWS = Math.ceil(WORLD_H / CELL);
export const GRID_CELLS = GRID_COLS * GRID_ROWS;
export const CELL_CAPACITY = 48;

export const PLAYER_RADIUS = 6;
export const DEFAULT_PICKUP_RANGE = 60;

// --- 풀 크기 (TDD §4.1) ---
export const MAX_ENEMIES = 1024;
export const MAX_PROJECTILES = 2048;
export const MAX_GEMS = 4096;

// --- 엔티티 플래그 비트 ---
export const FLAG_ALIVE = 1 << 0;
export const FLAG_ELITE = 1 << 1;
export const FLAG_BOSS = 1 << 2;

// --- 스폰 ---
export const SPAWN_RING_MIN = 200;
export const SPAWN_RING_SPAN = 80;

// --- 월드 해시 체크포인트 주기 (TDD §1.6) ---
export const CHECKPOINT_INTERVAL = 1800; // 30초

/** 엔진 버전. 시뮬 로직이 바뀌면 올린다. 리플레이 검증의 기준값. (TDD §7.2) */
export const ENGINE_VERSION = 1;
