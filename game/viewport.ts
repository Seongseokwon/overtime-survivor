import {
  VIEW_W_LANDSCAPE, VIEW_H_LANDSCAPE, VIEW_W_PORTRAIT, VIEW_H_PORTRAIT,
} from './core/constants';

export type ViewportMode = 'fixed' | 'fill';

export interface Viewport { viewW: number; viewH: number; scale: number; portrait: boolean }

const BASE_SHORT = 270;

/**
 * 뷰포트 계산 (TDD §2.2)
 *
 * fixed — 모든 기기가 같은 시야를 본다. 대신 여백이 남는다.
 * fill  — 정수 배율은 유지하되 내부 해상도를 화면에 맞춘다. 여백이 없지만 시야가 기기마다 다르다.
 *
 * M0 측정에서 iPhone(393x695)이 fixed 모드에서 가로 31%를 버리는 것이 확인되어
 * 두 모드를 모두 남겨뒀다. 최종 결정은 저사양 실기 측정 후.
 */
export function computeViewport(vw: number, vh: number, mode: ViewportMode): Viewport {
  const portrait = vh > vw;
  if (mode === 'fill') {
    const scale = Math.max(1, Math.floor(Math.min(vw, vh) / BASE_SHORT));
    return { viewW: Math.floor(vw / scale), viewH: Math.floor(vh / scale), scale, portrait };
  }
  const viewW = portrait ? VIEW_W_PORTRAIT : VIEW_W_LANDSCAPE;
  const viewH = portrait ? VIEW_H_PORTRAIT : VIEW_H_LANDSCAPE;
  const scale = Math.max(1, Math.floor(Math.min(vw / viewW, vh / viewH)));
  return { viewW, viewH, scale, portrait };
}

/**
 * 카메라 위치.
 *
 * 화면 중심 오프셋을 **정수로** 잡는 게 중요하다.
 * fill 모드에서는 viewW 가 홀수일 수 있는데(예: 393), `viewW / 2` 를 쓰면
 * 오프셋에 .5 가 붙는다. 카메라는 픽셀 그리드에 스냅해야 하므로 반올림되는데,
 * 그 반올림이 프레임마다 뒤집히면서 화면 전체가 1px씩 떨린다.
 * floor 로 정수 오프셋을 만들면 플레이어 화면 좌표가 완전히 고정된다.
 */
export function cameraFor(px: number, py: number, viewW: number, viewH: number, worldW: number, worldH: number): { x: number; y: number } {
  const halfW = Math.floor(viewW / 2);
  const halfH = Math.floor(viewH / 2);
  return {
    x: Math.max(0, Math.min(worldW - viewW, Math.round(px) - halfW)),
    y: Math.max(0, Math.min(worldH - viewH, Math.round(py) - halfH)),
  };
}
