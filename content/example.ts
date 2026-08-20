/**
 * 콘텐츠 데이터 작성 예시 — 스키마 사용법 레퍼런스
 * 실제 콘텐츠는 game/content/ 아래 도메인별 파일로 분리한다
 * (weapons.ts, enemies.ts, stages.ts ...). 여기서는 한 파일에 모아 흐름을 보인다.
 */
import {
  sec,
  type ContentPack,
  type WeaponDef,
  type EnemyDef,
  type BossDef,
  type StageDef,
  type CharacterDef,
  type CraftRecipe,
  type GameModeDef,
  type OvertimeConfig,
  type OathDef,
  validateContentPack,
} from './schema';

// ---------------------------------------------------------------------
// 무기
// ---------------------------------------------------------------------

const stapler: WeaponDef = {
  id: 'stapler',
  nameKo: '스테이플러',
  nameEn: 'Stapler',
  tier: 0,
  fireMode: { kind: 'straight', spreadRad: 0.12 },
  sprite: 'weapon/stapler',
  offerable: true,
  tags: ['projectile'],
  descKo: '진행 방향으로 심을 연사한다. 적을 관통한다.',
  levels: [
    { damage: 10, cooldownFrames: sec(0.9), count: 1, projectileSpeed: 4.5, pierce: 1, radius: 4, lifetimeFrames: sec(1.2) },
    { damage: 13, cooldownFrames: sec(0.85), count: 1, projectileSpeed: 4.8, pierce: 2, radius: 4, lifetimeFrames: sec(1.2) },
    { damage: 16, cooldownFrames: sec(0.8), count: 2, projectileSpeed: 5.0, pierce: 2, radius: 4, lifetimeFrames: sec(1.3) },
    { damage: 20, cooldownFrames: sec(0.72), count: 2, projectileSpeed: 5.4, pierce: 3, radius: 5, lifetimeFrames: sec(1.4) },
    { damage: 26, cooldownFrames: sec(0.65), count: 3, projectileSpeed: 5.8, pierce: 4, radius: 5, lifetimeFrames: sec(1.5) },
  ],
};

const highlighter: WeaponDef = {
  id: 'highlighter',
  nameKo: '형광펜',
  nameEn: 'Highlighter',
  tier: 0,
  fireMode: { kind: 'trail', spawnInterval: sec(0.25) },
  sprite: 'weapon/highlighter',
  offerable: true,
  tags: ['area', 'dot'],
  descKo: '지나간 자리에 형광 자국을 남긴다. 밟은 적이 지속 피해를 입는다.',
  levels: [
    { damage: 4, cooldownFrames: sec(0.25), count: 1, projectileSpeed: 0, pierce: -1, radius: 14, lifetimeFrames: sec(2.0) },
    { damage: 5, cooldownFrames: sec(0.25), count: 1, projectileSpeed: 0, pierce: -1, radius: 16, lifetimeFrames: sec(2.4) },
    { damage: 7, cooldownFrames: sec(0.22), count: 1, projectileSpeed: 0, pierce: -1, radius: 18, lifetimeFrames: sec(2.8) },
    { damage: 9, cooldownFrames: sec(0.2), count: 1, projectileSpeed: 0, pierce: -1, radius: 20, lifetimeFrames: sec(3.2) },
    { damage: 12, cooldownFrames: sec(0.18), count: 1, projectileSpeed: 0, pierce: -1, radius: 22, lifetimeFrames: sec(3.6) },
  ],
};

/** T1 합성 결과물. offerable: false — 오직 합성으로만 획득 */
const approvalBoard: WeaponDef = {
  id: 'approval_board',
  nameKo: '결재판',
  nameEn: 'Approval Board',
  tier: 1,
  fireMode: { kind: 'straight', spreadRad: 0.05 },
  sprite: 'weapon/approval_board',
  offerable: false,
  tags: ['projectile', 'control'],
  descKo: '관통하며 지나간 적에게 결재 도장을 찍는다. 마킹된 적이 받는 피해가 증가한다.',
  levels: [
    { damage: 22, cooldownFrames: sec(1.1), count: 1, projectileSpeed: 4.0, pierce: -1, radius: 8, lifetimeFrames: sec(1.6),
      status: [{ kind: 'mark', damageBonus: 0.3, duration: sec(3) }] },
    { damage: 30, cooldownFrames: sec(1.0), count: 1, projectileSpeed: 4.2, pierce: -1, radius: 9, lifetimeFrames: sec(1.8),
      status: [{ kind: 'mark', damageBonus: 0.35, duration: sec(3.5) }] },
    { damage: 40, cooldownFrames: sec(0.9), count: 2, projectileSpeed: 4.5, pierce: -1, radius: 10, lifetimeFrames: sec(2.0),
      status: [{ kind: 'mark', damageBonus: 0.4, duration: sec(4) }] },
  ],
};

const approvalRecipe: CraftRecipe = {
  id: 'craft_approval_board',
  inputs: [
    { weaponId: 'stapler', minLevel: 3 },
    { weaponId: 'highlighter', minLevel: 3 },
  ],
  outputWeaponId: 'approval_board',
  levelCarry: 'halfAverage',
  discoveredByDefault: true, // 첫 레시피는 튜토리얼 역할이므로 기본 공개
  hintKo: '관통하는 것과 표시하는 것을 합치면?',
};

// ---------------------------------------------------------------------
// 적
// ---------------------------------------------------------------------

const paperStack: EnemyDef = {
  id: 'paper_stack',
  nameKo: '서류 뭉치',
  sprite: 'enemy/paper_stack',
  spriteSize: 32,
  hp: 12,
  speed: 0.65,
  contactDamage: 6,
  contactCooldown: sec(0.5),
  radius: 7,
  knockbackResist: 0,
  behavior: { kind: 'chase' },
  drops: { gemValue: 1 },
  tier: 'trash',
};

const spamMail: EnemyDef = {
  id: 'spam_mail',
  nameKo: '스팸메일',
  sprite: 'enemy/spam_mail',
  spriteSize: 32,
  hp: 20,
  speed: 0.8,
  contactDamage: 5,
  contactCooldown: sec(0.5),
  radius: 7,
  knockbackResist: 0,
  behavior: { kind: 'splitter', childEnemyId: 'paper_stack', childCount: 2 },
  drops: { gemValue: 2 },
  tier: 'special',
};

const copier: EnemyDef = {
  id: 'copier',
  nameKo: '복사기',
  sprite: 'enemy/copier',
  spriteSize: 48,
  hp: 120,
  speed: 0.3,
  contactDamage: 14,
  contactCooldown: sec(0.7),
  radius: 13,
  knockbackResist: 0.8,
  behavior: { kind: 'chase' },
  drops: { gemValue: 6, specialChance: 0.08, specialId: 'heal_small' },
  tier: 'medium',
};

const fax: EnemyDef = {
  id: 'fax',
  nameKo: '팩스',
  sprite: 'enemy/fax',
  spriteSize: 32,
  hp: 45,
  speed: 0.4,
  contactDamage: 8,
  contactCooldown: sec(0.5),
  radius: 8,
  knockbackResist: 0.2,
  behavior: { kind: 'ranged', preferredRange: 140, fireInterval: sec(2.2), projectileSpeed: 2.2, projectileDamage: 9 },
  drops: { gemValue: 4 },
  tier: 'ranged',
};

const chairSwarm: EnemyDef = {
  id: 'chair_elite',
  nameKo: '회의실 의자 (엘리트)',
  sprite: 'enemy/chair_elite',
  spriteSize: 48,
  hp: 900,
  speed: 0.5,
  contactDamage: 18,
  contactCooldown: sec(0.6),
  radius: 14,
  knockbackResist: 1,
  behavior: { kind: 'charge', telegraphFrames: sec(0.8), chargeSpeed: 3.6, chargeFrames: sec(0.9), cooldownFrames: sec(2.5) },
  drops: { gemValue: 40 },
  tier: 'elite',
};

// ---------------------------------------------------------------------
// 보스
// ---------------------------------------------------------------------

const deadline: BossDef = {
  id: 'boss_deadline',
  nameKo: '마감',
  sprite: 'boss/deadline',
  spriteSize: 96,
  hp: 4200,
  radius: 22,
  timeoutFrames: sec(50),
  rewardOnKill: 900,
  rewardOnTimeout: 300,
  overtimeBonusPerSec: 15,
  phases: [
    { hpThreshold: 1.0, patternInterval: sec(3.5),
      patterns: [{ kind: 'closingWalls', shrinkSpeed: 0.25, dps: 20, retreatOnHit: 40 }] },
    { hpThreshold: 0.5, patternInterval: sec(2.8),
      patterns: [
        { kind: 'closingWalls', shrinkSpeed: 0.35, dps: 25, retreatOnHit: 30 },
        { kind: 'zoneBarrage', telegraphFrames: sec(0.8), zoneCount: 4, zoneRadius: 34, damage: 22 },
      ] },
  ],
};

const theBoss: BossDef = {
  id: 'boss_bujang',
  nameKo: '부장님',
  sprite: 'boss/bujang',
  spriteSize: 128,
  hp: 9000,
  radius: 28,
  timeoutFrames: sec(90),
  rewardOnKill: 2500,
  rewardOnTimeout: 800,
  overtimeBonusPerSec: 15,
  phases: [
    { hpThreshold: 1.0, patternInterval: sec(3.0),
      patterns: [{ kind: 'zoneBarrage', telegraphFrames: sec(0.9), zoneCount: 5, zoneRadius: 36, damage: 24 }] },
    { hpThreshold: 0.66, patternInterval: sec(2.6),
      patterns: [{ kind: 'shockwave', telegraphFrames: sec(0.8), expandSpeed: 3.0, damage: 30 }] },
    { hpThreshold: 0.33, patternInterval: sec(4.0),
      patterns: [{ kind: 'summon', enemyId: 'paper_stack', count: 40, invulnerable: true }] },
  ],
};

// ---------------------------------------------------------------------
// 스테이지 (표준 8분 = 28,800 프레임)
// ---------------------------------------------------------------------

const office: StageDef = {
  id: 'stage_office',
  nameKo: '12층 사무실',
  worldW: 2560,
  worldH: 1440,
  tileset: 'tiles/office',
  paletteRamp: ['midnight', 'predawn', 'sunrise'],
  obstacles: [
    { kind: 'partition', x: 600, y: 400, w: 160, h: 12, destructible: true, hp: 60, blocksSight: true },
    { kind: 'partition', x: 600, y: 400, w: 12, h: 140, destructible: true, hp: 60, blocksSight: true },
    { kind: 'vendingMachine', x: 1400, y: 900, w: 32, h: 48, destructible: false, blocksSight: false },
  ],
  midBossId: 'boss_deadline',
  midBossFrame: sec(180),   // 3:00
  finalBossId: 'boss_bujang',
  finalBossFrame: sec(390), // 6:30
  unlockAfterRuns: 0,
  waves: {
    maxAlive: 800,
    entries: [
      { enemyId: 'paper_stack', startFrame: 0, endFrame: sec(480), startRatePerSec: 1.5, endRatePerSec: 22 },
      { enemyId: 'spam_mail', startFrame: sec(90), endFrame: sec(480), startRatePerSec: 0.3, endRatePerSec: 4 },
      { enemyId: 'fax', startFrame: sec(120), endFrame: sec(480), startRatePerSec: 0.2, endRatePerSec: 2.5 },
      { enemyId: 'copier', startFrame: sec(150), endFrame: sec(480), startRatePerSec: 0.15, endRatePerSec: 1.8 },
    ],
    elites: [
      { atFrame: sec(90), enemyIds: ['chair_elite'], suppressNormalSpawn: true, reward: 'chest' },
      { atFrame: sec(270), enemyIds: ['chair_elite', 'chair_elite'], suppressNormalSpawn: true, reward: 'craftOffer' },
    ],
    specials: [
      { id: 'wave_meeting', atFrame: sec(330), durationFrames: sec(25), suppressNormalSpawn: false,
        announceKo: '정기 회의가 소집되었습니다',
        entries: [{ enemyId: 'paper_stack', startFrame: 0, endFrame: sec(25), startRatePerSec: 40, endRatePerSec: 40, pattern: 'surround' }] },
    ],
  },
};

// ---------------------------------------------------------------------
// 캐릭터 / 모드 / 설정
// ---------------------------------------------------------------------

const employeeK: CharacterDef = {
  id: 'char_k',
  nameKo: '사원 K',
  sprite: 'char/k',
  startingWeaponId: 'stapler',
  modifiers: [{ stat: 'payMultiplier', op: 'add', value: 0.1 }],
  unlockAfterRuns: 0,
  descKo: '3년차. 특별할 것 없지만 수당은 조금 더 챙긴다.',
};

const modes: GameModeDef[] = [
  { id: 'standard', nameKo: '정규 야근', durationFrames: sec(480), timeScale: 1.0, escalateAfterEnd: false, rankingEnabled: false, unlockAfterRuns: 0 },
  { id: 'short', nameKo: '칼퇴 러시', durationFrames: sec(240), timeScale: 2.0, escalateAfterEnd: false, rankingEnabled: false, unlockAfterRuns: 2 },
  { id: 'endless', nameKo: '무한 야근', durationFrames: 0, timeScale: 1.0, escalateAfterEnd: true, rankingEnabled: true, unlockAfterRuns: 10 },
];

const overtime: OvertimeConfig = {
  sampleRadius: 150,
  thresholdLow: 5,
  thresholdHigh: 15,
  gainLowPerSec: 10,
  gainHighPerSec: 20,
  decayPerSec: 12,
  hitPenalty: 35,
  maxGauge: 100,
  maxMultiplier: 3.0,
  lowHpThreshold: 0.3,
  lowHpBonusMultiplier: 0.5,
};

const oaths: OathDef[] = [
  { id: 'oath_dense', nameKo: '인원 감축', bit: 0, enemyHpMul: 1.0, spawnRateMul: 1.15, payBonus: 0.3, descKo: '적이 더 많이 몰려온다.' },
  { id: 'oath_tough', nameKo: '실적 압박', bit: 1, enemyHpMul: 1.2, spawnRateMul: 1.0, payBonus: 0.3, descKo: '적이 더 단단해진다.' },
];

// ---------------------------------------------------------------------
// 팩 조립
// ---------------------------------------------------------------------

export const CONTENT: ContentPack = {
  contentVersion: 1,
  weapons: [stapler, highlighter, approvalBoard],
  recipes: [approvalRecipe],
  passives: [],
  enemies: [paperStack, spamMail, copier, fax, chairSwarm],
  bosses: [deadline, theBoss],
  stages: [office],
  characters: [employeeK],
  modes,
  metaUpgrades: [],
  oaths,
  overtime,
};

// 개발 빌드 / CI 검증
const issues = validateContentPack(CONTENT);
if (issues.length > 0) {
  // eslint-disable-next-line no-console
  console.log(issues.map((i) => `[${i.severity}] ${i.path}: ${i.message}`).join('\n'));
} else {
  // eslint-disable-next-line no-console
  console.log('content pack OK — 참조 무결성 및 프레임 정수 검사 통과');
}
