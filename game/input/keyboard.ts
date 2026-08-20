import { encodeDirection, BIT_DASH, DIR_NONE, type InputFrame } from './InputFrame';

/** 키보드 입력 수집. 브라우저 전용 (game/core 규약 대상 아님). */
export function createKeyboardInput(): { sample(): InputFrame; dispose(): void } {
  const keys = new Set<string>();
  const down = (e: KeyboardEvent): void => {
    keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  };
  const up = (e: KeyboardEvent): void => { keys.delete(e.code); };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);

  return {
    sample(): InputFrame {
      let dx = 0, dy = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
      let input: InputFrame = dx === 0 && dy === 0 ? DIR_NONE : encodeDirection(dx, dy);
      if (keys.has('Space')) input |= BIT_DASH;
      return input;
    },
    dispose(): void {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      keys.clear();
    },
  };
}
