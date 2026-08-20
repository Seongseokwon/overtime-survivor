/**
 * 임시 절차적 아틀라스.
 *
 * 실제 아트가 나오기 전까지 32x32 자리표시자 스프라이트를 생성한다.
 * 아트 파이프라인(PRD §6.4)이 완성되면 이 파일은
 * `public/atlas/*.png` + JSON 로더로 교체된다.
 * 인터페이스(frameIndex → 아틀라스 좌표)는 그대로 유지되므로 교체 비용이 낮다.
 */
export const ATLAS_TILE = 32;
export const ATLAS_COLS = 16;

export const PALETTE = [
  '#0d0f14','#1a2b3c','#243447','#2e4258','#3d2b52','#54376e','#7a4a8a','#a05fa0',
  '#e8875a','#f5b76e','#ffe08a','#fff3c4','#7ee787','#4bb96a','#2e8b57','#1f6feb',
  '#58a6ff','#a5d6ff','#f85149','#ff7b72','#ffa198','#ffd7d5','#8b949e','#c8d0dc',
  '#eef2f7','#ffffff','#6e5030','#9c7440','#c49a5c','#3a2418','#5a3a24','#000000',
] as const;

export const FRAME_PLAYER = 32;
export const FRAME_PROJECTILE = 33;
export const FRAME_GEM = 34;

export function buildPlaceholderAtlas(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 512;
  const a = cv.getContext('2d')!;
  a.imageSmoothingEnabled = false;

  const bodies: [number, number][] = [
    [23, 22], [8, 26], [12, 14], [16, 15], [18, 19], [10, 9], [6, 7], [4, 5],
  ];
  const at = (idx: number): [number, number] => [
    (idx % ATLAS_COLS) * ATLAS_TILE,
    Math.floor(idx / ATLAS_COLS) * ATLAS_TILE,
  ];

  for (let type = 0; type < 8; type++) {
    for (let f = 0; f < 4; f++) {
      const [ox, oy] = at(type * 4 + f);
      const bob = [0, -1, 0, 1][f]!;
      const [fill, shade] = bodies[type]!;
      a.fillStyle = PALETTE[31]; a.fillRect(ox + 9, oy + 9 + bob, 14, 15);
      a.fillStyle = PALETTE[fill]!; a.fillRect(ox + 10, oy + 10 + bob, 12, 13);
      a.fillStyle = PALETTE[shade]!; a.fillRect(ox + 10, oy + 18 + bob, 12, 5);
      a.fillStyle = PALETTE[25]; a.fillRect(ox + 12 + (f % 2), oy + 13 + bob, 2, 2);
      a.fillRect(ox + 18 - (f % 2), oy + 13 + bob, 2, 2);
    }
  }
  {
    const [ox, oy] = at(FRAME_PLAYER);
    a.fillStyle = PALETTE[31]; a.fillRect(ox + 10, oy + 8, 12, 17);
    a.fillStyle = PALETTE[25]; a.fillRect(ox + 11, oy + 9, 10, 15);
    a.fillStyle = PALETTE[15]; a.fillRect(ox + 11, oy + 17, 10, 7);
  }
  {
    const [ox, oy] = at(FRAME_PROJECTILE);
    a.fillStyle = PALETTE[31]; a.fillRect(ox + 13, oy + 14, 6, 4);
    a.fillStyle = PALETTE[11]; a.fillRect(ox + 14, oy + 15, 4, 2);
  }
  {
    const [ox, oy] = at(FRAME_GEM);
    a.fillStyle = PALETTE[31]; a.fillRect(ox + 13, oy + 13, 6, 6);
    a.fillStyle = PALETTE[16]; a.fillRect(ox + 14, oy + 14, 4, 4);
  }
  return cv;
}
