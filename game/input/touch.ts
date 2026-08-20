import { encodeDirection, DIR_NONE, type InputFrame } from './InputFrame';

const DEAD_ZONE = 8;
const MAX_RADIUS = 48;

export interface JoystickState { active: boolean; originX: number; originY: number; x: number; y: number }

/**
 * 가상 조이스틱. 터치 시작 지점에 동적으로 생성된다 (PRD §7.1).
 * 고정 위치 조이스틱보다 엄지 위치 자유도가 높아 세로 화면에서 유리하다.
 */
export function createTouchInput(target: HTMLElement): {
  sample(): InputFrame;
  state: JoystickState;
  dispose(): void;
} {
  const state: JoystickState = { active: false, originX: 0, originY: 0, x: 0, y: 0 };
  let touchId: number | null = null;

  const start = (e: TouchEvent): void => {
    if (touchId !== null) return;
    const t = e.changedTouches[0];
    if (!t) return;
    touchId = t.identifier;
    state.active = true;
    state.originX = t.clientX; state.originY = t.clientY;
    state.x = t.clientX; state.y = t.clientY;
    e.preventDefault();
  };
  const move = (e: TouchEvent): void => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]!;
      if (t.identifier !== touchId) continue;
      state.x = t.clientX; state.y = t.clientY;
      e.preventDefault();
    }
  };
  const end = (e: TouchEvent): void => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i]!.identifier !== touchId) continue;
      touchId = null;
      state.active = false;
    }
  };

  target.addEventListener('touchstart', start, { passive: false });
  target.addEventListener('touchmove', move, { passive: false });
  target.addEventListener('touchend', end);
  target.addEventListener('touchcancel', end);

  return {
    state,
    sample(): InputFrame {
      if (!state.active) return DIR_NONE;
      const dx = state.x - state.originX;
      const dy = state.y - state.originY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < DEAD_ZONE) return DIR_NONE;
      const clamped = Math.min(d, MAX_RADIUS);
      return encodeDirection((dx / d) * clamped, (dy / d) * clamped);
    },
    dispose(): void {
      target.removeEventListener('touchstart', start);
      target.removeEventListener('touchmove', move);
      target.removeEventListener('touchend', end);
      target.removeEventListener('touchcancel', end);
    },
  };
}
