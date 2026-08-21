/**
 * 콘텐츠 팩 v4 — 발사 방식 다양화
 *
 * 주의: 여기 있는 수치는 전부 임시다. 밸런싱은 헤드리스 시뮬(tools/balance-sim)을
 * 돌리며 조정한다. 이 파일을 고칠 때 contentVersion 을 올린다.
 *
 * 무기 구성 의도 (PRD §4.2)
 *   v3까지는 기본 무기가 전부 "앞으로 나가는 투사체"였다. 그러면 합성해봐야
 *   "조금 더 센 투사체"가 나올 뿐이라 슬롯을 버리는 판단이 시시해진다.
 *   그래서 기본 7종을 **다섯 가지 다른 원형**으로 갈랐다.
 *
 *     직선 관통 (스테이플러) / 연사 (볼펜) / 산탄 (명함)
 *     부메랑 (무선 마우스) / 궤도 (우산) / 장판 (형광펜) / 자기중심 광역 (커피)
 *
 *   합성은 되도록 **다른 원형끼리** 묶어 결과물이 재료 어느 쪽과도 다르게
 *   플레이되도록 했다. 그래야 "무엇을 버리는가"가 진짜 선택이 된다.
 */
import { sec, validateContentPack, type ContentPack, type WeaponDef, type EnemyDef } from './schema';

// ─────────────────────────────────────────────────────────
// 기본 무기 (tier 0) — 전부 카드 풀에 등장한다
// ─────────────────────────────────────────────────────────

const stapler: WeaponDef = {
  id: 'stapler', nameKo: '스테이플러', nameEn: 'Stapler', tier: 0,
  fireMode: { kind: 'straight', spreadRad: 0.12 },
  sprite: 'weapon/stapler', offerable: true, tags: ['projectile'],
  descKo: '가장 가까운 적에게 심을 발사한다. 여러 명을 관통한다.',
  levels: [
    { damage: 10, cooldownFrames: sec(0.9),  count: 1, projectileSpeed: 4.5, pierce: 2, radius: 4, lifetimeFrames: sec(1.2) },
    { damage: 13, cooldownFrames: sec(0.85), count: 1, projectileSpeed: 4.8, pierce: 2, radius: 4, lifetimeFrames: sec(1.2) },
    { damage: 16, cooldownFrames: sec(0.8),  count: 2, projectileSpeed: 5.0, pierce: 3, radius: 4, lifetimeFrames: sec(1.3) },
    { damage: 20, cooldownFrames: sec(0.72), count: 2, projectileSpeed: 5.4, pierce: 3, radius: 5, lifetimeFrames: sec(1.4) },
    { damage: 26, cooldownFrames: sec(0.65), count: 3, projectileSpeed: 5.8, pierce: 4, radius: 5, lifetimeFrames: sec(1.5) },
  ],
};

const ballpen: WeaponDef = {
  id: 'ballpen', nameKo: '볼펜', nameEn: 'Ballpoint', tier: 0,
  fireMode: { kind: 'straight', spreadRad: 0.05 },
  sprite: 'weapon/ballpen', offerable: true, tags: ['projectile'],
  descKo: '빠르고 정확하게 연사한다. 한 발의 위력은 약하다.',
  levels: [
    { damage: 5,  cooldownFrames: sec(0.35), count: 1, projectileSpeed: 6.0, pierce: 1, radius: 3, lifetimeFrames: sec(0.9) },
    { damage: 6,  cooldownFrames: sec(0.32), count: 1, projectileSpeed: 6.2, pierce: 1, radius: 3, lifetimeFrames: sec(0.9) },
    { damage: 8,  cooldownFrames: sec(0.28), count: 2, projectileSpeed: 6.4, pierce: 1, radius: 3, lifetimeFrames: sec(1.0) },
    { damage: 10, cooldownFrames: sec(0.25), count: 2, projectileSpeed: 6.6, pierce: 2, radius: 3, lifetimeFrames: sec(1.0) },
    { damage: 13, cooldownFrames: sec(0.22), count: 3, projectileSpeed: 6.8, pierce: 2, radius: 3, lifetimeFrames: sec(1.1) },
  ],
};

const businessCard: WeaponDef = {
  id: 'business_card', nameKo: '명함', nameEn: 'Business Card', tier: 0,
  fireMode: { kind: 'shotgun', arcRad: 0.9 },
  sprite: 'weapon/business_card', offerable: true, tags: ['projectile', 'burst'],
  descKo: '전방 부채꼴로 명함을 뿌린다. 뭉친 적에게 강하다.',
  levels: [
    { damage: 7,  cooldownFrames: sec(1.4), count: 3, projectileSpeed: 4.0, pierce: 1, radius: 3, lifetimeFrames: sec(0.8) },
    { damage: 9,  cooldownFrames: sec(1.3), count: 4, projectileSpeed: 4.2, pierce: 1, radius: 3, lifetimeFrames: sec(0.9) },
    { damage: 12, cooldownFrames: sec(1.2), count: 5, projectileSpeed: 4.4, pierce: 2, radius: 3, lifetimeFrames: sec(1.0) },
    { damage: 15, cooldownFrames: sec(1.1), count: 6, projectileSpeed: 4.6, pierce: 2, radius: 4, lifetimeFrames: sec(1.1) },
    { damage: 19, cooldownFrames: sec(1.0), count: 7, projectileSpeed: 4.8, pierce: 3, radius: 4, lifetimeFrames: sec(1.2) },
  ],
};

const wirelessMouse: WeaponDef = {
  id: 'wireless_mouse', nameKo: '무선 마우스', nameEn: 'Wireless Mouse', tier: 0,
  fireMode: { kind: 'boomerang', returnAfter: sec(0.6) },
  sprite: 'weapon/mouse', offerable: true, tags: ['projectile'],
  descKo: '던지면 적을 뚫고 갔다가 손으로 돌아온다. 오갈 때 두 번 스친다.',
  levels: [
    { damage: 16, cooldownFrames: sec(1.1), count: 1, projectileSpeed: 4.2, pierce: 4, radius: 6, lifetimeFrames: sec(1.6) },
    { damage: 21, cooldownFrames: sec(1.0), count: 2, projectileSpeed: 4.4, pierce: 4, radius: 6, lifetimeFrames: sec(1.7) },
    { damage: 27, cooldownFrames: sec(0.9), count: 2, projectileSpeed: 4.6, pierce: 5, radius: 7, lifetimeFrames: sec(1.8) },
    { damage: 34, cooldownFrames: sec(0.8), count: 3, projectileSpeed: 4.8, pierce: 5, radius: 7, lifetimeFrames: sec(1.9) },
    { damage: 43, cooldownFrames: sec(0.7), count: 3, projectileSpeed: 5.0, pierce: 6, radius: 8, lifetimeFrames: sec(2.0) },
  ],
};

/**
 * 궤도 무기는 조준이 필요 없다. 붙는 적을 알아서 긁어내므로
 * "둘러싸이는 상황"에 대한 답이 된다.
 * 쿨다운을 수명과 같게 두어야 궤도가 겹쳐 쌓이지 않는다 (80-weapon.ts 참조).
 */
const umbrella: WeaponDef = {
  id: 'umbrella', nameKo: '우산', nameEn: 'Umbrella', tier: 0,
  fireMode: { kind: 'orbit', radius: 34, angularSpeed: 0.07 },
  sprite: 'weapon/umbrella', offerable: true, tags: ['defensive', 'melee'],
  descKo: '몸 주위를 돌며 달라붙는 적을 긁어낸다. 조준이 필요 없다.',
  levels: [
    { damage: 9,  cooldownFrames: sec(3.0), count: 2, projectileSpeed: 0, pierce: -1, radius: 34, lifetimeFrames: sec(3.0) },
    { damage: 12, cooldownFrames: sec(3.0), count: 2, projectileSpeed: 0, pierce: -1, radius: 34, lifetimeFrames: sec(3.0) },
    { damage: 15, cooldownFrames: sec(3.0), count: 3, projectileSpeed: 0, pierce: -1, radius: 38, lifetimeFrames: sec(3.0) },
    { damage: 19, cooldownFrames: sec(3.0), count: 4, projectileSpeed: 0, pierce: -1, radius: 38, lifetimeFrames: sec(3.0) },
    { damage: 24, cooldownFrames: sec(3.0), count: 5, projectileSpeed: 0, pierce: -1, radius: 42, lifetimeFrames: sec(3.0) },
  ],
};

const highlighter: WeaponDef = {
  id: 'highlighter', nameKo: '형광펜', nameEn: 'Highlighter', tier: 0,
  fireMode: { kind: 'trail', spawnInterval: sec(0.25) },
  sprite: 'weapon/highlighter', offerable: true, tags: ['area', 'dot'],
  descKo: '지나간 자리에 자국을 남긴다. 도망치면서 길을 깔 수 있다.',
  levels: [
    { damage: 6,  cooldownFrames: sec(0.30), count: 1, projectileSpeed: 0, pierce: -1, radius: 16, lifetimeFrames: sec(2.0) },
    { damage: 8,  cooldownFrames: sec(0.28), count: 1, projectileSpeed: 0, pierce: -1, radius: 18, lifetimeFrames: sec(2.2) },
    { damage: 10, cooldownFrames: sec(0.26), count: 1, projectileSpeed: 0, pierce: -1, radius: 20, lifetimeFrames: sec(2.4) },
    { damage: 13, cooldownFrames: sec(0.24), count: 1, projectileSpeed: 0, pierce: -1, radius: 22, lifetimeFrames: sec(2.6) },
    { damage: 17, cooldownFrames: sec(0.22), count: 1, projectileSpeed: 0, pierce: -1, radius: 25, lifetimeFrames: sec(2.8) },
  ],
};

const coffee: WeaponDef = {
  id: 'coffee', nameKo: '커피', nameEn: 'Coffee', tier: 0,
  fireMode: { kind: 'aoeSelf' },
  sprite: 'weapon/coffee', offerable: true, tags: ['area', 'burst'],
  descKo: '주변으로 뜨거운 것이 확 퍼진다. 붙은 적을 한 번에 정리한다.',
  levels: [
    { damage: 14, cooldownFrames: sec(1.6), count: 1, projectileSpeed: 0, pierce: -1, radius: 42, lifetimeFrames: sec(0.4) },
    { damage: 18, cooldownFrames: sec(1.5), count: 1, projectileSpeed: 0, pierce: -1, radius: 48, lifetimeFrames: sec(0.4) },
    { damage: 23, cooldownFrames: sec(1.4), count: 1, projectileSpeed: 0, pierce: -1, radius: 54, lifetimeFrames: sec(0.45) },
    { damage: 29, cooldownFrames: sec(1.3), count: 1, projectileSpeed: 0, pierce: -1, radius: 60, lifetimeFrames: sec(0.45) },
    { damage: 37, cooldownFrames: sec(1.2), count: 1, projectileSpeed: 0, pierce: -1, radius: 68, lifetimeFrames: sec(0.5) },
  ],
};

// ─────────────────────────────────────────────────────────
// 합성 결과물 — offerable: false (합성으로만 획득)
// ─────────────────────────────────────────────────────────

const approvalBoard: WeaponDef = {
  id: 'approval_board', nameKo: '결재판', nameEn: 'Approval Board', tier: 1,
  fireMode: { kind: 'straight', spreadRad: 0.05 },
  sprite: 'weapon/approval_board', offerable: false, tags: ['projectile', 'control'],
  descKo: '한 줄로 늘어선 적을 끝까지 꿰뚫는다. 관통 무제한.',
  levels: [
    { damage: 26, cooldownFrames: sec(0.7),  count: 2, projectileSpeed: 5.6, pierce: -1, radius: 8,  lifetimeFrames: sec(1.8),
      status: [{ kind: 'mark', damageBonus: 0.3, duration: sec(3) }] },
    { damage: 34, cooldownFrames: sec(0.62), count: 2, projectileSpeed: 5.8, pierce: -1, radius: 9,  lifetimeFrames: sec(2.0),
      status: [{ kind: 'mark', damageBonus: 0.35, duration: sec(3.5) }] },
    { damage: 45, cooldownFrames: sec(0.55), count: 3, projectileSpeed: 6.0, pierce: -1, radius: 10, lifetimeFrames: sec(2.2),
      status: [{ kind: 'mark', damageBonus: 0.4, duration: sec(4) }] },
  ],
};

const revolvingDoor: WeaponDef = {
  id: 'revolving_door', nameKo: '회전문', nameEn: 'Revolving Door', tier: 1,
  fireMode: { kind: 'orbit', radius: 56, angularSpeed: 0.05 },
  sprite: 'weapon/revolving_door', offerable: false, tags: ['defensive', 'area'],
  descKo: '거대한 문짝이 몸 주위를 돈다. 접근 자체가 불가능해진다.',
  levels: [
    { damage: 26, cooldownFrames: sec(3.0), count: 4, projectileSpeed: 0, pierce: -1, radius: 56, lifetimeFrames: sec(3.0) },
    { damage: 34, cooldownFrames: sec(3.0), count: 5, projectileSpeed: 0, pierce: -1, radius: 60, lifetimeFrames: sec(3.0) },
    { damage: 44, cooldownFrames: sec(3.0), count: 6, projectileSpeed: 0, pierce: -1, radius: 64, lifetimeFrames: sec(3.0) },
  ],
};

const espressoBomb: WeaponDef = {
  id: 'espresso_bomb', nameKo: '에스프레소 폭탄', nameEn: 'Espresso Bomb', tier: 1,
  fireMode: { kind: 'aoeSelf' },
  sprite: 'weapon/espresso', offerable: false, tags: ['area', 'burst'],
  descKo: '주변이 통째로 터진다. 화면 절반이 한 번에 정리된다.',
  levels: [
    { damage: 40, cooldownFrames: sec(1.4), count: 1, projectileSpeed: 0, pierce: -1, radius: 86,  lifetimeFrames: sec(0.5) },
    { damage: 52, cooldownFrames: sec(1.3), count: 1, projectileSpeed: 0, pierce: -1, radius: 96,  lifetimeFrames: sec(0.55) },
    { damage: 68, cooldownFrames: sec(1.2), count: 1, projectileSpeed: 0, pierce: -1, radius: 108, lifetimeFrames: sec(0.6) },
  ],
};

const droneSwarm: WeaponDef = {
  id: 'drone_swarm', nameKo: '무선 드론', nameEn: 'Drone Swarm', tier: 1,
  fireMode: { kind: 'boomerang', returnAfter: sec(0.5) },
  sprite: 'weapon/drone', offerable: false, tags: ['projectile'],
  descKo: '마우스가 드론 편대가 되어 사방으로 나갔다 돌아온다.',
  levels: [
    { damage: 28, cooldownFrames: sec(0.8), count: 4, projectileSpeed: 5.4, pierce: -1, radius: 6, lifetimeFrames: sec(1.7) },
    { damage: 36, cooldownFrames: sec(0.72), count: 5, projectileSpeed: 5.6, pierce: -1, radius: 7, lifetimeFrames: sec(1.8) },
    { damage: 47, cooldownFrames: sec(0.65), count: 6, projectileSpeed: 5.8, pierce: -1, radius: 7, lifetimeFrames: sec(1.9) },
  ],
};

const mondayMorning: WeaponDef = {
  id: 'monday_morning', nameKo: '월요일 아침', nameEn: 'Monday Morning', tier: 2,
  fireMode: { kind: 'aoeSelf' },
  sprite: 'weapon/monday', offerable: false, tags: ['area', 'burst'],
  descKo: '결재와 카페인이 겹치는 날. 화면에 있는 모든 것이 사라진다.',
  levels: [
    { damage: 88,  cooldownFrames: sec(1.6), count: 1, projectileSpeed: 0, pierce: -1, radius: 150, lifetimeFrames: sec(0.7) },
    { damage: 118, cooldownFrames: sec(1.5), count: 1, projectileSpeed: 0, pierce: -1, radius: 170, lifetimeFrames: sec(0.8) },
  ],
};

// ─────────────────────────────────────────────────────────
// 적
// ─────────────────────────────────────────────────────────

const enemy = (
  id: string, nameKo: string, hp: number, speed: number, dmg: number, gem: number,
  tier: EnemyDef['tier'], size: EnemyDef['spriteSize'] = 32,
): EnemyDef => ({
  id, nameKo, sprite: `enemy/${id}`, spriteSize: size,
  hp, speed, contactDamage: dmg, contactCooldown: sec(0.5),
  radius: size === 48 ? 13 : 7, knockbackResist: size === 48 ? 0.7 : 0,
  behavior: { kind: 'chase' },
  drops: { gemValue: gem },
  tier,
});

export const CONTENT: ContentPack = {
  contentVersion: 4,
  weapons: [
    stapler, ballpen, businessCard, wirelessMouse, umbrella, highlighter, coffee,  // 0~6 기본
    approvalBoard, revolvingDoor, espressoBomb, droneSwarm,                        // 7~10 T1
    mondayMorning,                                                                 // 11   T2
  ],
  recipes: [
    {
      // 같은 원형(직선)끼리 묶는 입문용 레시피. 결과가 예측 가능해 처음 배우기 좋다.
      id: 'craft_approval_board',
      inputs: [{ weaponId: 'stapler', minLevel: 3 }, { weaponId: 'ballpen', minLevel: 3 }],
      outputWeaponId: 'approval_board',
      levelCarry: 'halfAverage',
      discoveredByDefault: true,
      hintKo: '꿰뚫는 것과 빠른 것을 합치면',
    },
    {
      // 궤도 + 장판 → 더 큰 궤도. 방어 축을 극단으로 미는 선택.
      id: 'craft_revolving_door',
      inputs: [{ weaponId: 'umbrella', minLevel: 3 }, { weaponId: 'highlighter', minLevel: 3 }],
      outputWeaponId: 'revolving_door',
      levelCarry: 'halfAverage',
      discoveredByDefault: false,
      hintKo: '도는 것과 자국을 남기는 것을 합치면',
    },
    {
      // 광역 + 산탄 → 초광역. 화력 축의 끝.
      id: 'craft_espresso_bomb',
      inputs: [{ weaponId: 'coffee', minLevel: 3 }, { weaponId: 'business_card', minLevel: 3 }],
      outputWeaponId: 'espresso_bomb',
      levelCarry: 'halfAverage',
      discoveredByDefault: false,
      hintKo: '뜨거운 것과 뿌리는 것을 합치면',
    },
    {
      // 스테이플러를 결재판과 놓고 다투게 만든다 — 둘 다 가질 수는 없다.
      id: 'craft_drone_swarm',
      inputs: [{ weaponId: 'wireless_mouse', minLevel: 3 }, { weaponId: 'stapler', minLevel: 3 }],
      outputWeaponId: 'drone_swarm',
      levelCarry: 'halfAverage',
      discoveredByDefault: false,
      hintKo: '돌아오는 것과 꿰뚫는 것을 합치면',
    },
    {
      id: 'craft_monday_morning',
      inputs: [{ weaponId: 'approval_board', minLevel: 2 }, { weaponId: 'espresso_bomb', minLevel: 2 }],
      outputWeaponId: 'monday_morning',
      levelCarry: 'halfAverage',
      discoveredByDefault: false,
      hintKo: '결재와 카페인이 겹치는 날',
    },
  ],
  passives: [],
  enemies: [
    enemy('paper_stack', '서류 뭉치', 12, 0.78, 6, 1, 'trash'),
    enemy('spam_mail', '스팸메일', 20, 0.96, 5, 2, 'special'),
    enemy('fax', '팩스', 45, 0.48, 8, 4, 'ranged'),
    enemy('copier', '복사기', 120, 0.36, 14, 6, 'medium', 48),
  ],
  bosses: [],
  stages: [{
    id: 'stage_office', nameKo: '12층 사무실',
    worldW: 2560, worldH: 1440,
    tileset: 'tiles/office',
    paletteRamp: ['midnight', 'predawn', 'sunrise'],
    obstacles: [],
    midBossId: '', midBossFrame: sec(180),
    finalBossId: '', finalBossFrame: sec(390),
    unlockAfterRuns: 0,
    waves: {
      maxAlive: 800,
      entries: [
        { enemyId: 'paper_stack', startFrame: 0,        endFrame: sec(480), startRatePerSec: 1.5,  endRatePerSec: 22 },
        { enemyId: 'spam_mail',   startFrame: sec(90),  endFrame: sec(480), startRatePerSec: 0.3,  endRatePerSec: 4 },
        { enemyId: 'fax',         startFrame: sec(120), endFrame: sec(480), startRatePerSec: 0.2,  endRatePerSec: 2.5 },
        { enemyId: 'copier',      startFrame: sec(150), endFrame: sec(480), startRatePerSec: 0.15, endRatePerSec: 1.8 },
      ],
      elites: [],
      specials: [],
    },
  }],
  characters: [{
    id: 'char_k', nameKo: '사원 K', sprite: 'char/k',
    startingWeaponId: 'stapler',
    modifiers: [{ stat: 'payMultiplier', op: 'add', value: 0.1 }],
    unlockAfterRuns: 0,
    descKo: '3년차. 특별할 것 없지만 수당은 조금 더 챙긴다.',
  }],
  modes: [
    { id: 'standard', nameKo: '정규 야근', durationFrames: sec(480), timeScale: 1.0, escalateAfterEnd: false, rankingEnabled: false, unlockAfterRuns: 0 },
    { id: 'short',    nameKo: '칼퇴 러시', durationFrames: sec(240), timeScale: 2.0, escalateAfterEnd: false, rankingEnabled: false, unlockAfterRuns: 2 },
    { id: 'endless',  nameKo: '무한 야근', durationFrames: 0,        timeScale: 1.0, escalateAfterEnd: true,  rankingEnabled: true,  unlockAfterRuns: 10 },
  ],
  metaUpgrades: [],
  oaths: [],
  overtime: {
    sampleRadius: 150, thresholdLow: 5, thresholdHigh: 15,
    gainLowPerSec: 10, gainHighPerSec: 20, decayPerSec: 12,
    hitPenalty: 35, maxGauge: 100, maxMultiplier: 3.0,
    lowHpThreshold: 0.3, lowHpBonusMultiplier: 0.5,
  },
};

/** 개발/CI 용 — 참조 무결성 검사 (schema.ts §14) */
export function assertContentValid(): void {
  const issues = validateContentPack(CONTENT).filter((i) => i.severity === 'error');
  if (issues.length > 0) {
    throw new Error('콘텐츠 검증 실패:\n' + issues.map((i) => `  ${i.path}: ${i.message}`).join('\n'));
  }
}
