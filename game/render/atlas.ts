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
/** 인턴 J — 형광펜 색 포인트와 빠른 실루엣을 구분하는 임시 프레임 */
export const FRAME_PLAYER_INTERN = 35;

/** 장식 프레임 (decor.ts 와 인덱스를 맞춘다) */
export const FRAME_DESK = 40;
export const FRAME_PARTITION_V = 41;
export const FRAME_PARTITION_H = 42;
export const FRAME_PLANT = 43;
export const FRAME_CABINET = 44;
export const FRAME_STAIN = 45;
export const FRAME_PAPERS = 46;

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
    // 인턴 J: 밝은 셔츠, 형광펜 포인트, 한 칸 위로 튄 머리카락.
    // 실제 도트 에셋으로 교체할 때도 FRAME_PLAYER_INTERN을 유지한다.
    const [ox, oy] = at(FRAME_PLAYER_INTERN);
    a.fillStyle = PALETTE[31]; a.fillRect(ox + 9, oy + 7, 14, 19);
    a.fillStyle = PALETTE[24]; a.fillRect(ox + 10, oy + 9, 12, 16);
    a.fillStyle = PALETTE[15]; a.fillRect(ox + 11, oy + 18, 10, 7);
    a.fillStyle = PALETTE[18]; a.fillRect(ox + 10, oy + 7, 12, 3);
    a.fillStyle = PALETTE[10]; a.fillRect(ox + 21, oy + 13, 3, 9);
    a.fillStyle = PALETTE[25]; a.fillRect(ox + 12, oy + 13, 2, 2);
    a.fillRect(ox + 18, oy + 13, 2, 2);
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

  // ── 장식 ─────────────────────────────────────────────
  // 바닥보다 뚜렷하되 적보다는 눈에 덜 띄어야 한다. 적을 가리면 안 되므로
  // 채도를 낮추고 빨강 계열은 쓰지 않는다 (PRD §6.2 — 빨강은 위험 요소 전용).
  {
    const [ox, oy] = at(FRAME_DESK);           // 책상
    a.fillStyle = PALETTE[29]; a.fillRect(ox + 3, oy + 12, 26, 14);
    a.fillStyle = PALETTE[26]; a.fillRect(ox + 4, oy + 10, 24, 12);
    a.fillStyle = PALETTE[27]; a.fillRect(ox + 6, oy + 12, 20, 2);
    a.fillStyle = PALETTE[22]; a.fillRect(ox + 4, oy + 10, 24, 1);   // 윗면 하이라이트
    a.fillStyle = PALETTE[3];  a.fillRect(ox + 8, oy + 5, 12, 6);   // 모니터
    a.fillStyle = PALETTE[2];  a.fillRect(ox + 9, oy + 6, 10, 4);
  }
  {
    const [ox, oy] = at(FRAME_PARTITION_V);    // 세로 파티션
    a.fillStyle = PALETTE[3]; a.fillRect(ox + 12, oy + 2, 8, 28);
    a.fillStyle = PALETTE[2]; a.fillRect(ox + 13, oy + 3, 6, 26);
    a.fillStyle = PALETTE[22]; a.fillRect(ox + 13, oy + 2, 6, 1);
    a.fillStyle = PALETTE[3]; a.fillRect(ox + 13, oy + 9, 6, 1);
    a.fillRect(ox + 13, oy + 20, 6, 1);
  }
  {
    const [ox, oy] = at(FRAME_PARTITION_H);    // 가로 파티션
    a.fillStyle = PALETTE[3]; a.fillRect(ox + 2, oy + 12, 28, 8);
    a.fillStyle = PALETTE[2]; a.fillRect(ox + 3, oy + 13, 26, 6);
    a.fillStyle = PALETTE[22]; a.fillRect(ox + 2, oy + 12, 28, 1);
    a.fillStyle = PALETTE[3]; a.fillRect(ox + 10, oy + 13, 1, 6);
    a.fillRect(ox + 21, oy + 13, 1, 6);
  }
  {
    const [ox, oy] = at(FRAME_PLANT);          // 화분
    a.fillStyle = PALETTE[14]; a.fillRect(ox + 12, oy + 6, 8, 10);
    a.fillStyle = PALETTE[14]; a.fillRect(ox + 10, oy + 9, 12, 5);
    a.fillStyle = PALETTE[13]; a.fillRect(ox + 12, oy + 8, 8, 1);
    a.fillStyle = PALETTE[26]; a.fillRect(ox + 12, oy + 18, 8, 8);
    a.fillStyle = PALETTE[29]; a.fillRect(ox + 13, oy + 19, 6, 6);
  }
  {
    const [ox, oy] = at(FRAME_CABINET);        // 캐비닛
    a.fillStyle = PALETTE[2];  a.fillRect(ox + 6, oy + 4, 20, 24);
    a.fillStyle = PALETTE[3];  a.fillRect(ox + 7, oy + 5, 18, 22);
    a.fillStyle = PALETTE[22]; a.fillRect(ox + 6, oy + 4, 20, 1);
    a.fillStyle = PALETTE[2];  a.fillRect(ox + 9, oy + 9, 14, 1);
    a.fillRect(ox + 9, oy + 17, 14, 1);
    a.fillStyle = PALETTE[2];  a.fillRect(ox + 14, oy + 12, 4, 2);
  }
  {
    const [ox, oy] = at(FRAME_STAIN);          // 카펫 얼룩 (바닥)
    a.fillStyle = PALETTE[2];
    a.fillRect(ox + 8, oy + 12, 16, 8);
    a.fillRect(ox + 11, oy + 9, 10, 14);
    a.fillRect(ox + 6, oy + 14, 20, 4);
  }
  {
    const [ox, oy] = at(FRAME_PAPERS);         // 흩어진 종이 (바닥)
    a.fillStyle = PALETTE[3];
    a.fillRect(ox + 9, oy + 14, 7, 5);
    a.fillRect(ox + 17, oy + 11, 6, 4);
    a.fillRect(ox + 13, oy + 20, 5, 4);
  }

  return cv;
}

/**
 * 흰 실루엣 아틀라스.
 *
 * 피격 플래시를 스프라이트마다 tint 하면 500마리에서 비싸진다.
 * 아틀라스 전체를 흰색으로 한 번 구워두고, 플래시 중인 적은 이쪽에서
 * 그리면 추가 비용이 0이다. 도트 아트에서 특히 잘 먹는 고전 기법이다.
 */
export function buildWhiteAtlas(src: HTMLCanvasElement): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = src.width; cv.height = src.height;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.drawImage(src, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, cv.width, cv.height);
  c.globalCompositeOperation = 'source-over';
  return cv;
}
