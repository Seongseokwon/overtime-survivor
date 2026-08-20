/**
 * 콘텐츠 팩 v1 (M1 스캐폴딩용 최소 구성)
 *
 * 주의: 여기 있는 수치는 전부 임시다. 밸런싱은 M2~M3에서
 * 헤드리스 시뮬(tools/balance-sim)을 돌리며 조정한다.
 * 이 파일을 고칠 때 contentVersion 을 올린다.
 */
import { sec, validateContentPack, type ContentPack, type WeaponDef, type EnemyDef } from './schema';

const stapler: WeaponDef = {
  id: 'stapler', nameKo: '스테이플러', nameEn: 'Stapler', tier: 0,
  fireMode: { kind: 'straight', spreadRad: 0.12 },
  sprite: 'weapon/stapler', offerable: true, tags: ['projectile'],
  descKo: '가장 가까운 적에게 심을 발사한다. 적을 관통한다.',
  levels: [
    { damage: 10, cooldownFrames: sec(0.9),  count: 1, projectileSpeed: 4.5, pierce: 2, radius: 4, lifetimeFrames: sec(1.2) },
    { damage: 13, cooldownFrames: sec(0.85), count: 1, projectileSpeed: 4.8, pierce: 2, radius: 4, lifetimeFrames: sec(1.2) },
    { damage: 16, cooldownFrames: sec(0.8),  count: 2, projectileSpeed: 5.0, pierce: 3, radius: 4, lifetimeFrames: sec(1.3) },
    { damage: 20, cooldownFrames: sec(0.72), count: 2, projectileSpeed: 5.4, pierce: 3, radius: 5, lifetimeFrames: sec(1.4) },
    { damage: 26, cooldownFrames: sec(0.65), count: 3, projectileSpeed: 5.8, pierce: 4, radius: 5, lifetimeFrames: sec(1.5) },
  ],
};

const businessCard: WeaponDef = {
  id: 'business_card', nameKo: '명함', nameEn: 'Business Card', tier: 0,
  fireMode: { kind: 'shotgun', arcRad: 0.9 },
  sprite: 'weapon/business_card', offerable: true, tags: ['projectile', 'burst'],
  descKo: '전방 부채꼴로 명함을 뿌린다.',
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
  fireMode: { kind: 'straight', spreadRad: 0.35 },
  sprite: 'weapon/mouse', offerable: true, tags: ['projectile'],
  descKo: '마우스를 던진다. (부메랑 궤도는 M2에서 구현)',
  levels: [
    { damage: 14, cooldownFrames: sec(1.2), count: 1, projectileSpeed: 3.4, pierce: 3, radius: 6, lifetimeFrames: sec(1.6) },
    { damage: 18, cooldownFrames: sec(1.1), count: 2, projectileSpeed: 3.6, pierce: 3, radius: 6, lifetimeFrames: sec(1.7) },
    { damage: 23, cooldownFrames: sec(1.0), count: 2, projectileSpeed: 3.8, pierce: 4, radius: 7, lifetimeFrames: sec(1.8) },
    { damage: 29, cooldownFrames: sec(0.9), count: 3, projectileSpeed: 4.0, pierce: 4, radius: 7, lifetimeFrames: sec(1.9) },
    { damage: 36, cooldownFrames: sec(0.8), count: 3, projectileSpeed: 4.2, pierce: 5, radius: 8, lifetimeFrames: sec(2.0) },
  ],
};

/** T1 합성 결과물 — 합성으로만 획득 (offerable: false) */
const approvalBoard: WeaponDef = {
  id: 'approval_board', nameKo: '결재판', nameEn: 'Approval Board', tier: 1,
  fireMode: { kind: 'straight', spreadRad: 0.05 },
  sprite: 'weapon/approval_board', offerable: false, tags: ['projectile', 'control'],
  descKo: '관통하며 지나간 적에게 도장을 찍는다. 마킹된 적이 받는 피해가 증가한다.',
  levels: [
    { damage: 22, cooldownFrames: sec(1.1), count: 1, projectileSpeed: 4.0, pierce: -1, radius: 8, lifetimeFrames: sec(1.6),
      status: [{ kind: 'mark', damageBonus: 0.3, duration: sec(3) }] },
    { damage: 30, cooldownFrames: sec(1.0), count: 1, projectileSpeed: 4.2, pierce: -1, radius: 9, lifetimeFrames: sec(1.8),
      status: [{ kind: 'mark', damageBonus: 0.35, duration: sec(3.5) }] },
    { damage: 40, cooldownFrames: sec(0.9), count: 2, projectileSpeed: 4.5, pierce: -1, radius: 10, lifetimeFrames: sec(2.0),
      status: [{ kind: 'mark', damageBonus: 0.4, duration: sec(4) }] },
  ],
};

const enemy = (
  id: string, nameKo: string, hp: number, speed: number, dmg: number, gem: number,
  tier: EnemyDef['tier'], size: EnemyDef['spriteSize'] = 32,
): EnemyDef => ({
  id, nameKo, sprite: `enemy/${id}`, spriteSize: size,
  hp, speed, contactDamage: dmg, contactCooldown: sec(0.5),
  radius: size === 48 ? 13 : 7, knockbackResist: 0,
  behavior: { kind: 'chase' },
  drops: { gemValue: gem },
  tier,
});

export const CONTENT: ContentPack = {
  contentVersion: 1,
  weapons: [stapler, businessCard, wirelessMouse, approvalBoard],
  recipes: [{
    id: 'craft_approval_board',
    inputs: [{ weaponId: 'stapler', minLevel: 3 }, { weaponId: 'business_card', minLevel: 3 }],
    outputWeaponId: 'approval_board',
    levelCarry: 'halfAverage',
    discoveredByDefault: true,
    hintKo: '관통하는 것과 뿌리는 것을 합치면?',
  }],
  passives: [],
  enemies: [
    enemy('paper_stack', '서류 뭉치', 12, 0.65, 6, 1, 'trash'),
    enemy('spam_mail', '스팸메일', 20, 0.80, 5, 2, 'special'),
    enemy('fax', '팩스', 45, 0.40, 8, 4, 'ranged'),
    enemy('copier', '복사기', 120, 0.30, 14, 6, 'medium', 48),
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
