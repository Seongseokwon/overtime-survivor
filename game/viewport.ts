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

export function cameraFor(px: number, py: number, viewW: number, viewH: number, worldW: number, worldH: number): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(worldW - viewW, px - viewW / 2)),
    y: Math.max(0, Math.min(worldH - viewH, py - viewH / 2)),
  };
}
