/**
 * 필드 랜드마크 산포 (시각 전용)
 *
 * 왜 필요한가 — 첫 플레이 피드백에서 "배경이 움직이는지 캐릭터가 움직이는지
 * 모르겠고 어지럽다"는 문제가 나왔다. 원인은 두 가지다.
 *
 *  1. 32px 체커보드가 화면 전체를 덮으면 스크롤 시 고주파 패턴이 흘러
 *     시각적 미끄러짐(optical flow noise)을 만든다.
 *  2. 모든 타일이 동일해 **기준점이 없다.** 뇌는 "무엇이 정지해 있는가"를
 *     찾아 자기 운동을 판단하는데, 그 대상이 화면에 없으면 어지러움을 느낀다.
 *
 * 해결은 바닥의 대비를 낮추고, 대신 **서로 구별되는 물체를 드문드문** 두는 것이다.
 * 책상 하나가 화면을 가로질러 지나가면 "내가 움직였다"가 즉시 읽힌다.
 *
 * 구현: 월드를 128u 셀로 나누고 셀 좌표를 해시해 그 자리에 놓일 물체를 결정한다.
 * 저장 공간이 0이고, 보이는 셀만 순회하므로 월드가 아무리 커도 비용이 일정하다.
 *
 * 주의: 이것은 순수 장식이다. 충돌하는 실제 장애물은 StageDef.obstacles 에서
 * 오며(PRD §5의 파티션 미로 기믹), M2에서 이 위에 얹힌다.
 */

/**
 * 셀이 크면 화면에 랜드마크가 1~2개뿐이라 기준점 역할을 못 한다.
 * 480x270 뷰 기준으로 한 화면에 15~20개가 보이도록 잡았다.
 */
export const DECOR_CELL = 128;

/** 장식 스프라이트 프레임 인덱스 (atlas.ts 와 맞춰야 한다) */
export const FRAME_DESK = 40;
export const FRAME_PARTITION_V = 41;
export const FRAME_PARTITION_H = 42;
export const FRAME_PLANT = 43;
export const FRAME_CABINET = 44;
export const FRAME_STAIN = 45;
export const FRAME_PAPERS = 46;

/** 바닥에 깔리는 것 (엔티티 아래, 그림자처럼) */
const FLOOR_DECOR = [FRAME_STAIN, FRAME_PAPERS];
/** 서 있는 물체 (엔티티 아래지만 바닥 장식 위) */
const PROP_DECOR = [FRAME_DESK, FRAME_PARTITION_V, FRAME_PARTITION_H, FRAME_PLANT, FRAME_CABINET];

/** 정수 좌표 해시 — 결정론적이고 셀 간 상관이 없어야 한다 */
function hash2(x: number, y: number, salt: number): number {
  let h = (Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(salt, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2545f491) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x85ebca6b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export interface DecorItem { frame: number; x: number; y: number; floor: boolean }

/**
 * 카메라에 보이는 셀들의 장식을 콜백으로 흘려보낸다.
 * 배열을 만들지 않는다 — 렌더 핫 패스에서 할당하지 않기 위해서다 (TDD §10).
 */
export function forEachDecor(
  camX: number, camY: number, viewW: number, viewH: number,
  worldW: number, worldH: number,
  floorPass: boolean,
  emit: (frame: number, x: number, y: number) => void,
): void {
  const c0x = Math.max(0, Math.floor((camX - 48) / DECOR_CELL));
  const c1x = Math.min(Math.ceil(worldW / DECOR_CELL), Math.ceil((camX + viewW + 48) / DECOR_CELL));
  const c0y = Math.max(0, Math.floor((camY - 48) / DECOR_CELL));
  const c1y = Math.min(Math.ceil(worldH / DECOR_CELL), Math.ceil((camY + viewH + 48) / DECOR_CELL));

  for (let cy = c0y; cy < c1y; cy++) {
    for (let cx = c0x; cx < c1x; cx++) {
      const h = hash2(cx, cy, floorPass ? 7 : 13);
      // 셀당 0~2개. 밀도가 높으면 다시 "패턴"이 되어 기준점 역할을 잃는다.
      const count = (h & 3) === 3 ? 2 : (h & 3) === 0 ? 0 : 1;
      for (let k = 0; k < count; k++) {
        const hk = hash2(cx * 31 + k, cy * 17 + k, floorPass ? 101 : 211);
        const table = floorPass ? FLOOR_DECOR : PROP_DECOR;
        const frame = table[hk % table.length]!;
        const px = cx * DECOR_CELL + ((hk >>> 8) % DECOR_CELL);
        const py = cy * DECOR_CELL + ((hk >>> 18) % DECOR_CELL);
        emit(frame, px, py);
      }
    }
  }
}
