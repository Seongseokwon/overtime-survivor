/**
 * 야근 서바이버즈 — 콘텐츠 데이터 스키마
 * ------------------------------------------------------------------
 * 이 파일은 게임의 "진짜 스키마"다. DB 스키마보다 먼저 확정되어야 한다.
 *
 * 원칙
 *  1. 모든 시간 값은 **프레임 정수**다 (60fps). ms를 쓰지 않는다. → TDD §1.1
 *  2. 모든 거리 값은 **월드 유닛**이다 (1u = 1 논리 픽셀). → TDD §2
 *  3. 콘텐츠는 코드가 아니라 데이터다. 여기 정의된 타입 밖의 동작이 필요하면
 *     시스템 코드에 behavior 종류를 추가하고, 데이터는 그것을 "선택"만 한다.
 *  4. 데이터 변경은 contentVersion을 올린다. 시뮬 로직 변경(engineVersion)과 구분한다.
 */

// =====================================================================
// 0. 기본 단위 타입
// =====================================================================

/** 프레임 수 (60 = 1초) */
export type Frames = number;
/** 월드 유닛 */
export type Units = number;
/** 유닛/프레임 */
export type UnitsPerFrame = number;
/** 0.0 ~ 1.0 비율 */
export type Ratio = number;

export const FPS = 60;
export const sec = (s: number): Frames => Math.round(s * FPS);

// =====================================================================
// 1. 스탯
// =====================================================================

/** PRD §4.1의 플레이어 스탯 축. 캐릭터·패시브·메타 업그레이드가 모두 이 키로 기술된다. */
export type StatKey =
  | 'maxHp'
  | 'moveSpeed'
  | 'damageMul'
  | 'cooldownReduction'
  | 'projectileCount'
  | 'pickupRange'
  | 'defense'
  | 'hpRegen'
  | 'luck'
  | 'payMultiplier'
  | 'areaMul'
  | 'projectileSpeedMul'
  | 'durationMul';

/**
 * add   : 절대값 가산 (maxHp +20)
 * mul   : 곱연산 (damageMul ×1.15)
 * ratio : 비율 가산, 캡 적용 대상 (cooldownReduction +0.05 → 최대 0.60)
 */
export type StatOp = 'add' | 'mul' | 'ratio';

export interface StatModifier {
  readonly stat: StatKey;
  readonly op: StatOp;
  readonly value: number;
}

/** ratio 계열 스탯의 상한. 초과분은 버려진다. → PRD §4.1 */
export const STAT_CAPS: Partial<Record<StatKey, number>> = {
  cooldownReduction: 0.6,
  defense: 0.7,
};

// =====================================================================
// 2. 무기
// =====================================================================

export type WeaponTier = 0 | 1 | 2; // 0 = 기본, 1 = T1 합성, 2 = T2 합성

/**
 * 발사 방식. 시스템 코드(80-weapon-fire.ts)가 이 태그로 분기한다.
 * 새 방식이 필요하면 여기에 추가하고 시스템에 케이스를 넣는다 —
 * 데이터만으로 새 동작을 만들 수 있다고 착각하면 안 된다.
 */
export type FireMode =
  /** 진행 방향으로 직선 발사 */
  | { readonly kind: 'straight'; readonly spreadRad: number }
  /** 던졌다가 되돌아옴 */
  | { readonly kind: 'boomerang'; readonly returnAfter: Frames }
  /** 가장 가까운 적 자동 추적 */
  | { readonly kind: 'homing'; readonly turnRateRad: number }
  /** 플레이어 주위 궤도 회전 */
  | { readonly kind: 'orbit'; readonly radius: Units; readonly angularSpeed: number }
  /** 플레이어 위치 기준 즉발 광역 */
  | { readonly kind: 'aoeSelf' }
  /** 가장 가까운 적 위치에 광역 착탄 */
  | { readonly kind: 'aoeTarget'; readonly maxRange: Units }
  /** 이동 경로에 지속 장판 생성 */
  | { readonly kind: 'trail'; readonly spawnInterval: Frames }
  /** 전방 부채꼴 산탄 */
  | { readonly kind: 'shotgun'; readonly arcRad: number }
  /** 근접 강타 (짧은 사거리, 관통 없음) */
  | { readonly kind: 'melee'; readonly arcRad: number };

/** 명중 시 부여되는 상태이상 */
export type StatusApply =
  | { readonly kind: 'burn'; readonly dps: number; readonly duration: Frames }
  | { readonly kind: 'slow'; readonly amount: Ratio; readonly duration: Frames }
  | { readonly kind: 'mark'; readonly damageBonus: Ratio; readonly duration: Frames }
  | { readonly kind: 'knockback'; readonly force: UnitsPerFrame }
  | { readonly kind: 'stun'; readonly duration: Frames };

/** 무기 레벨별 수치. 인덱스 0 = 레벨 1. 배열 길이가 곧 최대 레벨. */
export interface WeaponLevel {
  readonly damage: number;
  readonly cooldownFrames: Frames;
  /** 동시 발사 개수 */
  readonly count: number;
  readonly projectileSpeed: UnitsPerFrame;
  /** 관통 가능 적 수. -1 = 무한 */
  readonly pierce: number;
  /** 효과 반경 (aoe/orbit/trail 계열) */
  readonly radius: Units;
  /** 투사체/장판 수명 */
  readonly lifetimeFrames: Frames;
  readonly status?: readonly StatusApply[];
}

export interface WeaponDef {
  readonly id: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly tier: WeaponTier;
  readonly fireMode: FireMode;
  /** 아틀라스 프레임 키 (아트 파이프라인이 생성한 JSON의 키) */
  readonly sprite: string;
  readonly levels: readonly WeaponLevel[];
  /** 빌드 아키타입 분류. 밸런스 시뮬 집계와 합성 힌트 UI에 쓰인다. */
  readonly tags: readonly WeaponTag[];
  /** 이 무기가 레벨업 카드 풀에 등장할 수 있는가. 합성 전용 결과물은 false. */
  readonly offerable: boolean;
  readonly descKo: string;
}

export type WeaponTag =
  | 'projectile' | 'area' | 'melee' | 'defensive'
  | 'dot' | 'control' | 'utility' | 'burst';

// =====================================================================
// 3. 합성 (PRD §4.2)
// =====================================================================

export interface CraftIngredient {
  readonly weaponId: string;
  /** 이 레벨 이상이어야 합성 카드가 등장한다. PRD §4.2 기준 3 */
  readonly minLevel: number;
}

export interface CraftRecipe {
  readonly id: string;
  readonly inputs: readonly CraftIngredient[]; // 2~3개
  readonly outputWeaponId: string;
  /**
   * 결과물의 시작 레벨 계산 방식.
   * 'halfAverage' = floor(재료 평균 레벨 / 2), 최소 1  (PRD §4.2)
   */
  readonly levelCarry: 'halfAverage' | 'one';
  /** 도감 해금 전에도 카드로 등장하는가. 튜토리얼용 레시피만 true. */
  readonly discoveredByDefault: boolean;
  readonly hintKo: string;
}

// =====================================================================
// 4. 패시브
// =====================================================================

export interface PassiveDef {
  readonly id: string;
  readonly nameKo: string;
  readonly sprite: string;
  /** 레벨별 누적이 아닌 "그 레벨일 때의 전체 효과"를 기술한다 */
  readonly levels: readonly (readonly StatModifier[])[];
  readonly descKo: string;
}

// =====================================================================
// 5. 적
// =====================================================================

export type EnemyBehavior =
  /** 플레이어를 직선 추적 */
  | { readonly kind: 'chase' }
  /** 일정 거리 유지하며 투사체 발사 */
  | { readonly kind: 'ranged'; readonly preferredRange: Units; readonly fireInterval: Frames; readonly projectileSpeed: UnitsPerFrame; readonly projectileDamage: number }
  /** 조준 → 정지 → 직선 돌진 */
  | { readonly kind: 'charge'; readonly telegraphFrames: Frames; readonly chargeSpeed: UnitsPerFrame; readonly chargeFrames: Frames; readonly cooldownFrames: Frames }
  /** 사망 시 더 작은 적으로 분열 */
  | { readonly kind: 'splitter'; readonly childEnemyId: string; readonly childCount: number }
  /** 플레이어 주변을 맴돌며 접근하지 않음 */
  | { readonly kind: 'orbiter'; readonly orbitRange: Units }
  /** 제자리 고정, 주기적 장판 생성 */
  | { readonly kind: 'turret'; readonly fireInterval: Frames; readonly zoneRadius: Units; readonly zoneDps: number };

export interface EnemyDrops {
  /** 경험치 젬 가치. 0이면 젬을 떨구지 않는다 */
  readonly gemValue: number;
  /** 회복/자석 등 특수 드랍 확률 (RngStream.Loot) */
  readonly specialChance?: Ratio;
  readonly specialId?: string;
}

export interface EnemyDef {
  readonly id: string;
  readonly nameKo: string;
  readonly sprite: string;
  readonly spriteSize: 32 | 48 | 96 | 128;
  readonly hp: number;
  readonly speed: UnitsPerFrame;
  /** 플레이어와 접촉 시 피해 (프레임당이 아니라 접촉 1회당) */
  readonly contactDamage: number;
  /** 접촉 피해 재적용까지의 무적 프레임 */
  readonly contactCooldown: Frames;
  readonly radius: Units;
  /** 넉백 저항. 1.0이면 완전 면역 */
  readonly knockbackResist: Ratio;
  readonly behavior: EnemyBehavior;
  readonly drops: EnemyDrops;
  readonly tier: 'trash' | 'medium' | 'ranged' | 'special' | 'elite' | 'boss';
}

// =====================================================================
// 6. 웨이브 / 스폰 디렉터 (PRD §4.3)
// =====================================================================

/**
 * 스폰 밀도 곡선. startFrame~endFrame 구간에서 ratePerSec가
 * startRate → endRate로 선형 보간된다.
 */
export interface SpawnEntry {
  readonly enemyId: string;
  readonly startFrame: Frames;
  readonly endFrame: Frames;
  readonly startRatePerSec: number;
  readonly endRatePerSec: number;
  /** 링 스폰 대신 특수 배치가 필요한 경우 */
  readonly pattern?: 'ring' | 'burstCluster' | 'lineFromEdge' | 'surround';
}

/** 명확한 성격을 가진 삽입 웨이브. PRD §4.3의 "특수 웨이브" */
export interface SpecialWave {
  readonly id: string;
  readonly atFrame: Frames;
  readonly durationFrames: Frames;
  /** 이 웨이브 동안 일반 스폰을 중단할 것인가 */
  readonly suppressNormalSpawn: boolean;
  readonly entries: readonly SpawnEntry[];
  readonly announceKo: string;
}

/** 엘리트 조우. 잡몹 스폰을 중단하고 화면을 정리한다. PRD §4.4 */
export interface EliteEncounter {
  readonly atFrame: Frames;
  readonly enemyIds: readonly string[];
  readonly suppressNormalSpawn: true;
  /** 처치 시 보상 */
  readonly reward: 'chest' | 'craftOffer' | 'weaponUpgrade';
}

export interface WaveTable {
  readonly entries: readonly SpawnEntry[];
  readonly specials: readonly SpecialWave[];
  readonly elites: readonly EliteEncounter[];
  /** 동시 활성 적 상한. 초과 시 스폰이 조용히 버려진다 (TDD §4.3) */
  readonly maxAlive: number;
}

// =====================================================================
// 7. 보스 (PRD §4.4)
// =====================================================================

export type BossPattern =
  /** 지정 위치에 예고 후 장판 폭발 */
  | { readonly kind: 'zoneBarrage'; readonly telegraphFrames: Frames; readonly zoneCount: number; readonly zoneRadius: Units; readonly damage: number }
  /** 본체 중심 원형 충격파 */
  | { readonly kind: 'shockwave'; readonly telegraphFrames: Frames; readonly expandSpeed: UnitsPerFrame; readonly damage: number }
  /** 잡몹 대량 소환. 소환 중 본체 무적 */
  | { readonly kind: 'summon'; readonly enemyId: string; readonly count: number; readonly invulnerable: true }
  /** 화면 가장자리가 좁혀옴 (마감) */
  | { readonly kind: 'closingWalls'; readonly shrinkSpeed: UnitsPerFrame; readonly dps: number; readonly retreatOnHit: Units }
  /** 회전하는 스포트라이트 (회의) */
  | { readonly kind: 'rotatingBeam'; readonly arcRad: number; readonly angularSpeed: number; readonly dps: number };

export interface BossPhase {
  /** 이 페이즈로 전이하는 체력 비율 임계값 (1.0 = 시작) */
  readonly hpThreshold: Ratio;
  readonly patterns: readonly BossPattern[];
  /** 패턴 간 간격 */
  readonly patternInterval: Frames;
}

export interface BossDef {
  readonly id: string;
  readonly nameKo: string;
  readonly sprite: string;
  readonly spriteSize: 96 | 128;
  readonly hp: number;
  readonly radius: Units;
  readonly phases: readonly BossPhase[];
  /** 시간 초과 시에도 통과 가능. 처치 시 보상 3배. PRD §4.4 */
  readonly timeoutFrames: Frames;
  readonly rewardOnKill: number;
  readonly rewardOnTimeout: number;
  /** 보스전 중 수당 게이지 추가 상승량 (초당) */
  readonly overtimeBonusPerSec: number;
}

// =====================================================================
// 8. 스테이지 (PRD §5)
// =====================================================================

export interface ObstacleDef {
  readonly kind: 'partition' | 'shelf' | 'vendingMachine' | 'rail';
  readonly x: Units;
  readonly y: Units;
  readonly w: Units;
  readonly h: Units;
  readonly destructible: boolean;
  readonly hp?: number;
  /** 시야를 가리는가 (파티션 미로 기믹) */
  readonly blocksSight: boolean;
}

export interface StageDef {
  readonly id: string;
  readonly nameKo: string;
  readonly worldW: Units;
  readonly worldH: Units;
  readonly tileset: string;
  /** 시간대별 배경 팔레트 램프 키 (PRD §6.2) */
  readonly paletteRamp: readonly string[];
  readonly obstacles: readonly ObstacleDef[];
  readonly waves: WaveTable;
  /** 빈 문자열이면 이 스테이지에 미드보스가 없다 */
  readonly midBossId: string;
  readonly midBossFrame: Frames;
  /** 빈 문자열이면 최종보스가 없다 */
  readonly finalBossId: string;
  readonly finalBossFrame: Frames;
  readonly unlockAfterRuns: number;
}

// =====================================================================
// 9. 캐릭터 (PRD §2.4)
// =====================================================================

export interface CharacterDef {
  readonly id: string;
  readonly nameKo: string;
  readonly sprite: string;
  readonly startingWeaponId: string;
  /** 기본 스탯 대비 보정 */
  readonly modifiers: readonly StatModifier[];
  readonly unlockAfterRuns: number;
  readonly descKo: string;
}

// =====================================================================
// 10. 모드 (PRD §2.3)
// =====================================================================

export type GameModeId = 'standard' | 'short' | 'endless';

export interface GameModeDef {
  readonly id: GameModeId;
  readonly nameKo: string;
  /** endless는 0 = 무제한 */
  readonly durationFrames: Frames;
  /** 웨이브 테이블 시간축 배율. short 모드는 2.0(2배 빠르게) */
  readonly timeScale: number;
  /** durationFrames 이후 난이도 계속 상승 (endless) */
  readonly escalateAfterEnd: boolean;
  readonly rankingEnabled: boolean;
  readonly unlockAfterRuns: number;
}

// =====================================================================
// 11. 오버타임 게이지 (PRD §4.5)
// =====================================================================

export interface OvertimeConfig {
  readonly sampleRadius: Units;
  readonly thresholdLow: number;      // 이 이상이면 상승 시작
  readonly thresholdHigh: number;     // 이 이상이면 가속 상승
  readonly gainLowPerSec: number;
  readonly gainHighPerSec: number;
  readonly decayPerSec: number;
  readonly hitPenalty: number;        // 피격 시 즉시 감소량
  readonly maxGauge: number;
  readonly maxMultiplier: number;
  /** 체력이 이 비율 이하일 때 추가 배율 */
  readonly lowHpThreshold: Ratio;
  readonly lowHpBonusMultiplier: number;
}

// =====================================================================
// 12. 메타 진행 (PRD §4.7)
// =====================================================================

export interface MetaUpgradeDef {
  readonly id: string;
  readonly nameKo: string;
  /** 단계별 비용 (수당). 배열 길이 = 최대 단계 */
  readonly costs: readonly number[];
  /** 단계별 효과 (누적 아님, 그 단계의 전체 효과) */
  readonly levels: readonly (readonly StatModifier[])[];
  readonly descKo: string;
}

/** 초과근무 서약 — 자발적 난이도 상승 (PRD §4.7) */
export interface OathDef {
  readonly id: string;
  readonly nameKo: string;
  readonly bit: number; // 리플레이 헤더 oathFlags의 비트 위치 (TDD §7.2)
  readonly enemyHpMul: number;
  readonly spawnRateMul: number;
  readonly payBonus: number; // 수당 배수 가산
  readonly descKo: string;
}

// =====================================================================
// 13. 루트 콘텐츠 팩
// =====================================================================

export interface ContentPack {
  /** 데이터 변경 시 증가. 리플레이 헤더의 contentVer와 대조 (TDD §7.2) */
  readonly contentVersion: number;
  readonly weapons: readonly WeaponDef[];
  readonly recipes: readonly CraftRecipe[];
  readonly passives: readonly PassiveDef[];
  readonly enemies: readonly EnemyDef[];
  readonly bosses: readonly BossDef[];
  readonly stages: readonly StageDef[];
  readonly characters: readonly CharacterDef[];
  readonly modes: readonly GameModeDef[];
  readonly metaUpgrades: readonly MetaUpgradeDef[];
  readonly oaths: readonly OathDef[];
  readonly overtime: OvertimeConfig;
}

// =====================================================================
// 14. 로드 타임 검증
// =====================================================================

/**
 * 콘텐츠 팩 무결성 검사. 개발 빌드와 CI에서 실행한다.
 * 데이터로 콘텐츠를 만드는 대가는 "타입이 못 잡는 참조 오류"이므로,
 * 이 검사가 없으면 존재하지 않는 weaponId를 가리키는 레시피가 런타임까지 살아남는다.
 */
export interface ValidationIssue {
  readonly severity: 'error' | 'warn';
  readonly path: string;
  readonly message: string;
}

export function validateContentPack(pack: ContentPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const weaponIds = new Set(pack.weapons.map((w) => w.id));
  const enemyIds = new Set(pack.enemies.map((e) => e.id));
  const bossIds = new Set(pack.bosses.map((b) => b.id));

  const err = (path: string, message: string) =>
    issues.push({ severity: 'error', path, message });
  const warn = (path: string, message: string) =>
    issues.push({ severity: 'warn', path, message });

  // 참조 무결성
  for (const r of pack.recipes) {
    for (const inp of r.inputs) {
      if (!weaponIds.has(inp.weaponId)) err(`recipes.${r.id}`, `없는 재료 무기: ${inp.weaponId}`);
    }
    if (!weaponIds.has(r.outputWeaponId)) err(`recipes.${r.id}`, `없는 결과 무기: ${r.outputWeaponId}`);
    if (r.inputs.length < 2 || r.inputs.length > 3) err(`recipes.${r.id}`, `재료는 2~3개여야 함 (현재 ${r.inputs.length})`);
  }
  for (const c of pack.characters) {
    if (!weaponIds.has(c.startingWeaponId)) err(`characters.${c.id}`, `없는 시작 무기: ${c.startingWeaponId}`);
  }
  for (const e of pack.enemies) {
    if (e.behavior.kind === 'splitter' && !enemyIds.has(e.behavior.childEnemyId)) {
      err(`enemies.${e.id}`, `없는 분열 대상: ${e.behavior.childEnemyId}`);
    }
  }
  for (const s of pack.stages) {
    if (s.midBossId !== '' && !bossIds.has(s.midBossId)) err(`stages.${s.id}`, `없는 미드보스: ${s.midBossId}`);
    if (s.finalBossId !== '' && !bossIds.has(s.finalBossId)) err(`stages.${s.id}`, `없는 최종보스: ${s.finalBossId}`);
    if (s.midBossId === '' && s.finalBossId === '') {
      warn(`stages.${s.id}`, '보스가 하나도 없다 — 스캐폴딩 단계에서만 정상이다');
    }
    for (const entry of s.waves.entries) {
      if (!enemyIds.has(entry.enemyId)) err(`stages.${s.id}.waves`, `없는 적: ${entry.enemyId}`);
      if (entry.endFrame <= entry.startFrame) err(`stages.${s.id}.waves`, `${entry.enemyId}: endFrame이 startFrame 이하`);
    }
    for (const el of s.waves.elites) {
      for (const id of el.enemyIds) {
        if (!enemyIds.has(id)) err(`stages.${s.id}.elites`, `없는 엘리트: ${id}`);
      }
    }
  }

  // 결정론 규약: 모든 프레임 값은 정수여야 한다 (TDD §1.1)
  const checkInt = (path: string, name: string, v: number) => {
    if (!Number.isInteger(v)) err(path, `${name}은 정수 프레임이어야 함: ${v}`);
  };
  for (const w of pack.weapons) {
    w.levels.forEach((lv, i) => {
      checkInt(`weapons.${w.id}.levels[${i}]`, 'cooldownFrames', lv.cooldownFrames);
      checkInt(`weapons.${w.id}.levels[${i}]`, 'lifetimeFrames', lv.lifetimeFrames);
    });
    if (w.levels.length === 0) err(`weapons.${w.id}`, '레벨이 비어 있음');
    if (w.tier > 0 && w.offerable) {
      warn(`weapons.${w.id}`, '합성 결과물이 카드 풀에 직접 등장하도록 설정됨 — 의도한 것인가?');
    }
  }

  // 합성 결과물은 반드시 어떤 레시피의 output이어야 한다
  const outputs = new Set(pack.recipes.map((r) => r.outputWeaponId));
  for (const w of pack.weapons) {
    if (w.tier > 0 && !outputs.has(w.id)) {
      err(`weapons.${w.id}`, `tier ${w.tier} 무기인데 이를 만드는 레시피가 없음 — 획득 불가`);
    }
  }

  // 서약 비트 중복
  const bits = new Set<number>();
  for (const o of pack.oaths) {
    if (bits.has(o.bit)) err(`oaths.${o.id}`, `중복된 비트 위치: ${o.bit}`);
    if (o.bit < 0 || o.bit > 7) err(`oaths.${o.id}`, `oathFlags는 8비트 (0~7): ${o.bit}`);
    bits.add(o.bit);
  }

  return issues;
}
