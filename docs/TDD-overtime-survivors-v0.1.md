# 야근 서바이버즈 — 기술 설계 문서 (TDD)

| 항목 | 내용 |
|---|---|
| 문서 버전 | v0.1 |
| 작성일 | 2026-08-20 |
| 상위 문서 | PRD v0.2 |
| 대상 | M0~M1 착수 전 확정 필요 사항 |

---

## 0. 이 문서의 범위 — "바꾸기 비싼 것만"

이 문서에는 **나중에 바꾸면 이미 짠 코드를 갈아엎어야 하는 결정**만 담는다.

| 담는다 | 담지 않는다 |
|---|---|
| 결정론 규약, 좌표계, 모듈 의존 방향 | 적 체력, 무기 데미지 (→ 콘텐츠 데이터) |
| 리플레이 포맷, 시스템 실행 순서 | UI 레이아웃, 색상 (→ 아트/디자인) |
| 렌더러 인터페이스, 풀 크기 상수 | 웨이브 구성 (→ 콘텐츠 데이터) |

밸런스 수치는 100번 바뀐다. 그건 문서가 아니라 데이터 파일에 있어야 하고, 플레이하면서 조정한다.
반면 §1의 결정론 규약을 나중에 도입하려면 게임 엔진 전체를 다시 짜야 한다. 그래서 이 문서의 절반이 §1이다.

---

## 1. 결정론 시뮬레이션 규약 ⭐

**목표:** `(시드, 입력 시퀀스, 엔진 버전)`이 같으면 어떤 브라우저·기기·실행 시점에서도 **비트 단위로 동일한 결과**가 나와야 한다.

이게 성립하면 다음이 전부 공짜로 따라온다.

- 서버 리플레이 검증 (PRD §10.4) — 랭킹 치트 방지의 근간
- 버그 재현: "시드 12345, 프레임 3421에서 죽음" → 항상 재현
- 자동 밸런스 시뮬: 헤드리스로 1000판 돌려 통계 수집
- 리플레이 공유 기능 (수 KB로 한 판 전체 전송)

성립하지 않으면 위 넷을 전부 포기하거나, 게임을 다시 짜야 한다.

### 1.1 고정 타임스텝

```ts
export const FIXED_DT_MS = 1000 / 60;   // 16.666...
export const MAX_CATCHUP_STEPS = 5;      // 프레임 드랍 시 최대 따라잡기
```

```ts
let accumulator = 0;
let prevTime = perfNow();

function frame(now: number) {
  const delta = Math.min(now - prevTime, 250);  // 탭 비활성 복귀 시 폭주 방지
  prevTime = now;
  accumulator += delta;

  let steps = 0;
  while (accumulator >= FIXED_DT_MS && steps < MAX_CATCHUP_STEPS) {
    world.step(input.sample());   // ← 결정론 구역. dt를 인자로 받지 않는다
    accumulator -= FIXED_DT_MS;
    steps++;
  }
  if (steps === MAX_CATCHUP_STEPS) accumulator = 0;  // 따라잡기 포기, 시간 버림

  renderer.draw(world);
  requestAnimationFrame(frame);
}
```

**규칙**

- `world.step()`은 **dt를 인자로 받지 않는다.** 프레임 = 시간 단위다. `dt`를 받는 순간 가변 시간이 스며들 여지가 생긴다.
- 모든 시간 값은 **프레임 정수**로 표현한다. `cooldownMs: 800` ❌ → `cooldownFrames: 48` ✅
- 시뮬레이션 안에서 `performance.now()`, `Date.now()` 호출 **금지**.
- `MAX_CATCHUP_STEPS` 도달 시 시간을 버리는 것이 옳다. 로직상 프레임은 건너뛴 적이 없으므로 결정론은 유지되고, 리플레이에는 "그 프레임에 그 입력이 들어왔다"만 남는다.

### 1.2 난수 — 시드 PRNG와 스트림 분리

**알고리즘: sfc32** (32비트 정수 연산만 사용, 빠르고 통계 품질 충분, 구현이 10줄).

```ts
function sfc32(a: number, b: number, c: number, d: number) {
  return function () {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}
```

**핵심 규칙: 용도별로 난수 스트림을 분리한다.**

```ts
enum RngStream {
  Spawn      = 0,   // 적 스폰 위치·종류
  Loot       = 1,   // 드랍 판정
  CardOffer  = 2,   // 레벨업 3택 구성
  Crit       = 3,   // 치명타 판정
  Cosmetic   = 4,   // 파티클 등 시뮬 무관 (검증 대상 아님)
}
// 스트림별 시드 = hash(masterSeed, streamId)
```

하나의 스트림을 여러 시스템이 공유하면, **어느 한 시스템의 난수 호출 횟수만 바뀌어도 나머지 전부의 결과가 달라진다.** 밸런스 패치로 드랍 판정을 한 번 더 굴렸을 뿐인데 스폰 패턴이 통째로 바뀌고, 저장된 리플레이가 전부 깨진다. 스트림 분리는 그걸 막는다.

`Cosmetic` 스트림은 검증 대상에서 제외한다. 파티클 개수가 기기 성능에 따라 달라져도 게임 결과에 영향이 없어야 하며, 그러려면 시뮬 스트림과 분리되어 있어야 한다.

### 1.3 부동소수점 — 실제 함정은 여기 있다

JavaScript의 `number`는 IEEE 754 double이고, **사칙연산(`+ - * /`)과 `Math.sqrt`는 IEEE 754가 결과를 정확히 규정**하므로 엔진·플랫폼이 달라도 동일하다. 여기까지는 안전하다.

**위험한 것은 초월함수다.** `Math.sin`, `Math.cos`, `Math.tan`, `Math.pow`, `Math.exp`, `Math.log`, `Math.atan2`, `Math.hypot`은 ECMAScript 명세가 "구현 근사(implementation-approximated)"로 두어, **V8·JavaScriptCore·SpiderMonkey가 서로 다른 최하위 비트를 낼 수 있다.** 브라우저 버전이 올라가며 바뀔 수도 있다.

한 번의 ULP 차이가 8분 뒤 완전히 다른 게임 상태를 만든다. 이건 이론적 우려가 아니라, 결정론 게임에서 가장 흔한 실패 원인이다.

**대응: 시뮬레이션 안에서 초월함수 자체 구현본만 사용한다.**

```ts
// game/core/fixedmath.ts
const SIN_TABLE_BITS = 12;                 // 4096 엔트리
const SIN_TABLE_SIZE = 1 << SIN_TABLE_BITS;
const SIN_TABLE = new Float64Array(SIN_TABLE_SIZE);
// 빌드 타임에 생성해 상수로 박아 넣는다 (런타임 Math.sin 호출조차 하지 않음)

export function dSin(radians: number): number { /* 테이블 + 선형보간 */ }
export function dCos(radians: number): number { /* dSin(r + PI/2) */ }
export function dAtan2(y: number, x: number): number { /* 다항식 근사, 자체 구현 */ }
export function dSqrt(v: number): number { return Math.sqrt(v); }  // ✅ IEEE 규정, 안전
export function dLen(x: number, y: number): number { return Math.sqrt(x * x + y * y); }
```

> 각도 정밀도는 게임 로직에 충분하다. 4096 엔트리 + 선형보간이면 오차 ~1e-7 수준이고, 무엇보다 **모든 기기에서 같은 오차**다. 정확도보다 재현성이 중요하다.

**거리 비교는 제곱으로.** `dLen(dx,dy) < r` 대신 `dx*dx + dy*dy < r*r`. sqrt 호출을 줄이는 최적화이면서 오차 원인도 하나 줄인다.

### 1.4 반복 순서

부동소수 덧셈은 교환법칙은 성립해도 **결합법칙이 성립하지 않는다.** `(a+b)+c ≠ a+(b+c)`. 따라서 순회 순서가 다르면 결과가 다르다.

- 엔티티 순회는 **항상 배열 인덱스 오름차순**.
- `Set`/`Map` 순회 **금지** (삽입 순서 의존 → 로직 변경 시 순서가 조용히 바뀜).
- `Array.prototype.sort`는 비교 함수가 **완전 순서**를 정의해야 한다. 동점이 나오면 반드시 `id`로 tie-break.
  ```ts
  arr.sort((a, b) => (b.priority - a.priority) || (a.id - b.id));  // tie-break 필수
  ```
- `for...in` 금지 (속성 순서 보장 취약).
- 엔티티 제거는 swap-remove를 쓰되, **제거 순서를 인덱스 내림차순으로 고정**한다.

### 1.5 금지 목록 (ESLint로 강제)

`game/` 디렉터리 하위에서 다음을 금지한다. 규약을 문서로만 두면 3주 뒤에 깨진다.

```js
// eslint.config.mjs — game/** 에만 적용
'no-restricted-globals': ['error',
  { name: 'Date',        message: '시뮬레이션에서 시간 조회 금지. 프레임 카운터를 쓸 것' },
  { name: 'performance', message: '동일' },
],
'no-restricted-properties': ['error',
  { object: 'Math', property: 'random', message: 'rng.next(RngStream.X) 사용' },
  { object: 'Math', property: 'sin',    message: 'fixedmath.dSin 사용' },
  { object: 'Math', property: 'cos',    message: 'fixedmath.dCos 사용' },
  { object: 'Math', property: 'tan',    message: 'fixedmath 사용' },
  { object: 'Math', property: 'atan2',  message: 'fixedmath.dAtan2 사용' },
  { object: 'Math', property: 'hypot',  message: 'fixedmath.dLen 사용' },
  { object: 'Math', property: 'pow',    message: 'fixedmath.dPow 또는 곱셈 전개' },
  { object: 'Math', property: 'exp',    message: 'fixedmath 사용' },
  { object: 'Math', property: 'log',    message: 'fixedmath 사용' },
],
'no-restricted-syntax': ['error',
  { selector: 'ForInStatement', message: 'for...in 금지 (순서 비보장)' },
],
```

**허용:** `Math.sqrt`, `Math.abs`, `Math.floor`, `Math.ceil`, `Math.round`, `Math.min`, `Math.max`, `Math.sign`, `Math.trunc` — 모두 IEEE 754/명세가 정확히 규정.

### 1.6 검증 방법

```ts
// tests/determinism.test.ts
it('같은 시드+입력은 같은 월드 해시를 낸다', () => {
  const runA = simulate(seed, inputLog, 28_800);  // 8분 = 28,800 프레임
  const runB = simulate(seed, inputLog, 28_800);
  expect(runA.hash).toBe(runB.hash);
});

it('골든 리플레이가 회귀하지 않는다', () => {
  for (const golden of GOLDEN_REPLAYS) {
    expect(simulate(golden.seed, golden.input, golden.frames).hash).toBe(golden.hash);
  }
});
```

**월드 해시:** 매 프레임 계산하면 느리므로 **1800프레임(30초)마다** 계산한다. 전체 엔티티의 위치·체력·프레임 카운터를 FNV-1a로 접어 32비트 값을 낸다. 리플레이에도 이 체크포인트 해시를 함께 기록해, 서버 검증 시 **어느 구간에서 갈라졌는지**를 바로 알 수 있게 한다.

골든 리플레이는 M1부터 쌓는다. 엔진을 건드릴 때마다 CI가 회귀를 잡아준다. 밸런스 변경으로 골든이 깨지는 것은 정상이며, 그때는 `engineVersion`을 올리고 골든을 갱신한다.

---

## 2. 좌표계 · 단위계

| 항목 | 정의 |
|---|---|
| 단위 | 1 unit = 1 논리 픽셀 (내부 렌더 해상도 기준) |
| 축 | X 오른쪽 +, **Y 아래쪽 +** (캔버스 관례와 일치) |
| 각도 | 라디안. 0 = +X 방향, 증가 방향은 화면상 시계방향 (Y-down이므로) |
| 원점 | 월드 좌상단 (0, 0) |
| 월드 크기 | 스테이지별 유한. 기본 **2560 × 1440 units** |
| 플레이어 반지름 | 6u |
| 잡몹 반지름 | 7u |
| 젬 픽업 기본 범위 | 60u |
| 충돌 그리드 셀 | 64u |

**왜 무한 맵이 아닌가.** 원작 뱀서는 무한 스크롤이지만, PRD §5의 스테이지 기믹(파티션 미로, 골목, 선로)은 전부 **유한한 지형 배치**를 전제한다. 유한 맵이면 지형을 손으로 디자인할 수 있고, 스폰 링 계산과 카메라 클램프가 단순해지며, 공간 해시 그리드 크기도 고정된다. 2560×1440은 480×270 화면의 약 5.3×5.3배로, 8분 런에서 도망칠 공간으로 충분하다.

**가장자리 처리:** 하드 벽. 플레이어는 맵 밖으로 못 나가고, 적 스폰 링은 맵 경계를 넘지 않도록 클램프된다. 구석에 몰리면 위험해지는 것은 의도된 긴장이다.

### 2.1 카메라와 픽셀 스냅

```ts
camera.x = clamp(player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
camera.y = clamp(player.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
// 렌더 직전에만 스냅 (시뮬 값은 건드리지 않는다)
const camRenderX = Math.round(camera.x);
const camRenderY = Math.round(camera.y);
```

**픽셀아트에서 이건 타협 불가다.** 카메라를 소수점 위치에 두면 스크롤할 때 스프라이트 픽셀이 매 프레임 미세하게 흔들려 도트를 고른 의미가 사라진다. 스프라이트 위치도 렌더 시 `Math.round`한다.

### 2.2 화면 스케일링

```ts
const VIEW_W = isPortrait ? 270 : 480;
const VIEW_H = isPortrait ? 480 : 270;
const scale = Math.max(1, Math.floor(Math.min(vw / VIEW_W, vh / VIEW_H)));
// 정수 배율만. 남는 공간은 레터박스.
```

정수 배율이 아니면 픽셀이 뭉개진다. 캔버스 CSS 크기는 `VIEW_W * scale`로 고정하고 중앙 정렬, 나머지는 배경색으로 채운다. `imageSmoothingEnabled = false`, CSS `image-rendering: pixelated`를 함께 건다.

> **⚠️ M0 측정에서 드러난 문제 (2026-08-20).** iPhone(393×695 CSS)에서 `floor(min(393/270, 695/480)) = 1`이 되어, 캔버스가 화면 가로의 69%만 차지하고 31%가 여백으로 버려졌다. 2배로 키우기엔 화면이 좁고 1배면 못 채우는, 정수 배율 규칙의 구조적 한계다.
>
> 대안은 **내부 해상도를 화면 비율에 맞추는 것**이다. `scale = max(1, floor(min(vw,vh) / 270))`로 배율을 먼저 정하고 `viewW = floor(vw/scale)`, `viewH = floor(vh/scale)`로 내부 해상도를 계산하면, 픽셀은 여전히 정확한 정수배이면서 화면을 꽉 채운다. 대가는 **기기마다 시야(FOV)가 달라진다**는 것으로, 엔드리스 랭킹의 공정성에 영향을 준다 (넓은 화면이 유리).
>
> 절충안: 내부 해상도를 화면에 맞추되 **월드 가시 영역을 상한으로 제한**하고 초과분은 레터박스로 덮는다. 시야는 같고 여백만 줄어든다.
>
> M0 실기 측정(고정 vs 채움 각각 1회)으로 성능 차이를 확인한 뒤 확정한다. 픽셀 수가 2.1배 차이나므로 저사양 기기에서는 성능 판단이 결정에 개입할 수 있다.

---

## 3. 모듈 경계 ⭐

### 3.1 의존 방향

```
  app/ (Next.js 라우트)
      ↓
  components/ (React HUD·메뉴)
      ↓
  game/render/  ←──  game/core, game/ecs, game/systems, game/content
      ↑                          ↑
  game/input/                tools/, tests/ (헤드리스 실행)
```

**절대 규칙: `game/core`, `game/ecs`, `game/systems`, `game/content`는 다음을 import하지 않는다.**

- `react`, `react-dom`, `next/*`
- `document`, `window`, `navigator` 등 DOM 전역
- `canvas`, `Image`, `Audio` 등 브라우저 API

**이유:** 이 코드는 **Node에서도 그대로 실행되어야 한다.** 서버 리플레이 검증(PRD §10.4)과 헤드리스 밸런스 시뮬이 여기에 달려 있다. 브라우저 API가 한 줄이라도 섞이면 서버 검증을 위해 시뮬레이션을 두 번 구현해야 하고, 두 구현이 미세하게 달라지는 순간 결정론이 무너진다.

```js
// eslint: import/no-restricted-paths
{ target: './game/{core,ecs,systems,content}/**',
  from: ['./node_modules/react/**', './node_modules/next/**', './components/**', './app/**'] }
```

### 3.2 렌더러 인터페이스

PixiJS 전환 가능성을 열어두는 경계선이다. **시스템 코드는 이 인터페이스만 알고, 구현체를 몰라야 한다.**

```ts
// game/render/Renderer.ts
export interface Renderer {
  init(canvas: HTMLCanvasElement, viewW: number, viewH: number): Promise<void>;
  resize(scale: number): void;

  beginFrame(cameraX: number, cameraY: number): void;
  drawBackground(stageId: string): void;
  /** atlasIndex/frameIndex는 아틀라스 JSON에서 온 정수 인덱스 */
  drawSprite(atlasIndex: number, frameIndex: number, x: number, y: number, flipX: boolean, tint: number): void;
  drawRect(x: number, y: number, w: number, h: number, color: number, alpha: number): void;
  drawParticles(buffer: Float32Array, count: number): void;
  endFrame(): void;

  destroy(): void;
  readonly stats: { drawCalls: number; lastFrameMs: number };
}
```

- `Canvas2DRenderer`가 1차 구현. M0에서 성능 미달 시 `WebGLRenderer`(PixiJS 래핑)를 같은 인터페이스로 추가한다.
- 인터페이스에 Canvas 특유 개념(`CanvasRenderingContext2D`, `globalCompositeOperation`)을 노출하지 않는다. 새어 나가는 순간 전환이 불가능해진다.
- `drawSprite`가 스프라이트 객체가 아니라 **정수 인덱스**를 받는 것도 의도적이다. 핫 패스에서 객체를 만들지 않기 위해서다.

### 3.3 디렉터리 (PRD §9.5 확정본)

```
/app                    Next.js 라우트 (/, /play, /rank, /me)
/components             React HUD·메뉴 (게임 상태를 구독만, 변경은 이벤트로)
/game
  /core                 loop, rng, fixedmath, constants, eventbus, worldhash
  /ecs                  컴포넌트 배열, 엔티티 할당자, 풀
  /systems              실행 순서대로 번호 접두사 (10-input, 20-movement, ...)
  /content              무기/적/합성/웨이브/스테이지 데이터 + 스키마
  /render               Renderer 인터페이스, canvas2d/, atlas 로더
  /input                keyboard, touch-joystick, InputFrame 인코딩
  /replay               기록, 재생, 직렬화, 검증
/lib                    api client, auth (게임과 무관)
/prisma                 스키마
/tools                  sprite-normalize, sprite-validate, atlas-build, balance-sim
/tests                  determinism, golden-replays, unit
```

---

## 4. ECS 데이터 레이아웃

### 4.1 SoA 배열

```ts
// game/ecs/components.ts
export const MAX_ENEMIES     = 1024;
export const MAX_PROJECTILES = 2048;
export const MAX_GEMS        = 4096;
export const MAX_PARTICLES   = 2048;   // Cosmetic — 시뮬 무관

export const enemyX      = new Float32Array(MAX_ENEMIES);
export const enemyY      = new Float32Array(MAX_ENEMIES);
export const enemyVX     = new Float32Array(MAX_ENEMIES);
export const enemyVY     = new Float32Array(MAX_ENEMIES);
export const enemyHp     = new Float32Array(MAX_ENEMIES);
export const enemyDefId  = new Uint16Array(MAX_ENEMIES);
export const enemyFlags  = new Uint8Array(MAX_ENEMIES);    // 비트: alive, elite, stunned, burning
export const enemyTimer  = new Uint16Array(MAX_ENEMIES);   // 프레임 단위
export let   enemyCount  = 0;                              // 조밀 배열, [0, enemyCount) 만 유효
```

**조밀 배열 + swap-remove.** 죽은 엔티티는 마지막 원소를 그 자리에 옮기고 `count--`. 순회가 항상 `for (let i = 0; i < count; i++)`라 캐시 효율이 좋고 분기가 없다.

**주의:** swap-remove는 순회 중 인덱스를 흔든다. 제거는 순회 중에 하지 않고 **제거 목록에 모았다가 순회 후 인덱스 내림차순으로 일괄 처리**한다 (§1.4).

### 4.2 엔티티 참조

투사체가 특정 적을 추적하는 등 참조가 필요한 경우, 인덱스만으로는 swap-remove 후 다른 적을 가리키게 된다. **`(index, generation)` 쌍**을 쓴다.

```ts
export const enemyGen = new Uint16Array(MAX_ENEMIES);  // 슬롯 재사용 시 +1
// 참조 유효성: enemyGen[idx] === storedGen && (enemyFlags[idx] & ALIVE)
```

### 4.3 풀 소진 정책

풀이 가득 차면 **새 스폰을 조용히 버린다** (예외를 던지지 않는다). 단, 개발 빌드에서는 경고 카운터를 올려 계측에 남긴다. 8분 런에서 풀 소진이 발생하면 그건 디렉터 튜닝 문제이지 런타임 오류가 아니다.

---

## 5. 시스템 실행 순서 ⭐

**순서가 결정론과 게임 필(feel) 양쪽에 직결된다.** 파일명에 번호를 붙여 순서를 코드에 각인시킨다.

| # | 시스템 | 역할 |
|---|---|---|
| 10 | `input` | InputFrame 해석 → 플레이어 의도 벡터 |
| 20 | `playerMovement` | 플레이어 이동, 맵 경계 클램프 |
| 30 | `spawnDirector` | 웨이브 테이블 + 동적 보정 → 적 스폰 |
| 40 | `enemyAI` | 추적/돌진/원거리 행동, 속도 결정 |
| 50 | `enemySeparation` | 적끼리 밀어내기 (2프레임에 1회) |
| 60 | `enemyMovement` | 속도 적용, 위치 갱신 |
| 70 | `spatialHash` | 그리드 재구축 (이 시점의 위치 기준) |
| 80 | `weaponFire` | 쿨다운 감소, 투사체 생성 |
| 90 | `projectileMovement` | 투사체 이동 |
| 100 | `collision` | 투사체↔적, 적↔플레이어, 플레이어↔젬 |
| 110 | `damageResolve` | 피해 적용, 사망 판정, 드랍 생성 |
| 120 | `overtimeGauge` | 주변 적 밀도 → 수당 배율 갱신 (PRD §4.5) |
| 130 | `pickup` | 젬/아이템 흡수, 경험치 적립 |
| 140 | `levelUp` | 레벨업 판정 → 카드 3택 생성, 시뮬 일시정지 |
| 150 | `bossPhase` | 보스 페이즈 전이, 패턴 스케줄 |
| 160 | `statusEffects` | 화상/둔화/마킹 틱 |
| 170 | `cleanup` | 제거 목록 일괄 처리 (인덱스 내림차순) |
| 180 | `worldHash` | 1800프레임마다 체크포인트 해시 |

**설계 근거 몇 가지**

- `spatialHash`(70)를 이동(60) **다음**, 충돌(100) **이전**에 둔다. 이동 전 위치로 판정하면 빠른 투사체가 적을 통과한다.
- `overtimeGauge`(120)를 `damageResolve`(110) 다음에 둔다. 피격 판정이 끝난 뒤 게이지를 깎아야 "맞으면 즉시 리셋"이 프레임 단위로 정확하다.
- `levelUp`(140)은 시뮬레이션을 **정지**시킨다. 카드 선택이 들어올 때까지 `world.step()`은 호출되지만 아무 시스템도 진행하지 않고, 리플레이에는 `(frame, cardIndex)`만 기록된다.
- 이 순서를 바꾸면 결정론이 깨진다. 변경 시 `engineVersion`을 올린다.

---

## 6. 충돌 판정

**공간 해시 그리드**, 셀 64u. 2560×1440 월드 = 40×23 = 920셀 고정 배열.

```ts
// 셀당 최대 32개, 초과분은 버림 (개발 빌드에서 경고)
const cellEntities = new Int16Array(920 * 32);
const cellCount    = new Uint8Array(920);
```

- 판정은 **원-원만.** AABB나 다각형은 쓰지 않는다. 픽셀아트 32px 스프라이트에서 원 판정은 충분히 정확하고, 무엇보다 연산이 `dx*dx + dy*dy < r*r` 한 줄이다.
- 투사체는 자기 셀 + 인접 8셀만 조회.
- **적↔적 분리는 전수 계산하지 않는다.** 인접 4셀만, 2프레임에 1회. 적 500기에서 완벽한 분리는 필요 없고, "겹쳐 보이지 않을 정도"면 된다.
- **프레임당 판정 예산 상한:** 60,000회. 초과 시 그 프레임의 남은 판정을 다음 프레임으로 미룬다 — 단, **이 이월도 결정론적**이어야 하므로 이월 큐의 순서를 인덱스 기준으로 고정한다.

---

## 7. 리플레이 포맷

### 7.1 입력 인코딩

```
InputFrame (16비트)
  bit 0-7   : 이동 방향 (256분할 각도, 255 = 정지)
  bit 8     : 대시
  bit 9     : 일시정지 토글
  bit 10-15 : 예약
```

**델타 인코딩.** 매 프레임 기록하면 8분 = 28,800 × 2B = 57.6KB. 그런데 입력은 대부분 연속해서 같다.

```
[frameDelta: varint][input: uint16]  ← 입력이 바뀐 프레임만
```

실측 예상 **2~6KB** (압축 전). 엔드리스 모드는 상한을 두고 청크 단위로 전송한다.

### 7.2 파일 구조

```
Header (32B)
  magic        "OVTR"        4B
  formatVer    uint16        2B
  engineVer    uint32        4B   ← 시뮬 로직 버전. 불일치 시 검증 불가
  contentVer   uint32        4B   ← 밸런스 데이터 버전
  masterSeed   uint32        4B
  mode         uint8         1B   (standard / short / endless)
  characterId  uint8         1B
  stageId      uint8         1B
  oathFlags    uint8         1B
  totalFrames  uint32        4B
  reserved                   6B

InputChunk    델타 인코딩된 입력 스트림
ChoiceChunk   [frame: uint32][cardIndex: uint8]  ← 레벨업 선택
CheckpointChunk  [frame: uint32][worldHash: uint32]  ← 1800프레임마다
```

`engineVer`와 `contentVer`를 분리하는 이유: 밸런스 수치만 바꾼 패치(`contentVer`만 증가)에서는 이전 리플레이가 여전히 **재생 가능**해야 한다(결과는 달라지지만 크래시하지 않아야 함). 반면 `engineVer`가 다르면 검증 자체를 시도하지 않는다.

### 7.3 서버 검증 흐름

```
클라이언트 → POST /api/run/finish { header, inputChunk, choiceChunk, checkpoints, claimedResult }
서버:
  1. engineVer 일치 확인 → 불일치 시 랭킹 제외 (재화는 상식 검증만으로 지급)
  2. 헤드리스 시뮬 실행 (같은 TS 코드, Node)
  3. checkpoints 대조 → 최초 불일치 프레임 식별
  4. 최종 결과 대조 → 일치 시 랭킹 등재
```

체크포인트가 있으면 "어디서부터 갈라졌는지"를 즉시 알 수 있다. 전체 재생 후 결과만 비교하면 조작인지 버그인지 구분이 안 된다.

---

## 8. 렌더 파이프라인

### 8.1 레이어 순서

| 레이어 | 내용 | 방식 |
|---|---|---|
| 0 | 배경 타일 | 오프스크린 캔버스에 1회 렌더 → 매 프레임 blit |
| 1 | 지형/장애물 (파티션 등) | 스프라이트 |
| 2 | 바닥 이펙트 (장판, 형광펜 자국) | 저해상도 레이어 |
| 3 | 젬 / 아이템 | 스프라이트 |
| 4 | 적 (Y 정렬) | 스프라이트 |
| 5 | 플레이어 | 스프라이트 |
| 6 | 투사체 | 스프라이트 |
| 7 | 파티클 | 저해상도 레이어 후 업스케일 |
| 8 | 예고 표시 (보스 텔레그래프) | `drawRect` + 스프라이트 |
| — | HUD | **DOM/React** (캔버스 밖) |

**HUD를 DOM으로 두는 이유:** 캔버스에 텍스트를 그리면 매 프레임 폰트 래스터화가 일어나 비싸다. HUD는 초당 몇 번만 바뀌므로 React가 훨씬 싸고, 접근성·다국어·폰트 렌더링이 공짜로 따라온다. 다만 **React 리렌더가 게임 루프를 막지 않도록**, HUD는 게임 상태를 직접 구독하지 않고 이벤트 버스가 30Hz로 throttle한 스냅샷만 받는다.

**Y 정렬:** 적 레이어만 Y 기준 정렬한다. 매 프레임 500개를 정렬하면 비싸므로, **셀 단위 버킷 정렬**(그리드 행 순서대로 순회)로 근사한다. 완벽한 순서는 필요 없다.

### 8.2 보간을 하지 않는다

로직이 60Hz이고 대부분의 디스플레이가 60Hz이므로, **v1에서는 렌더 보간을 구현하지 않는다.** 120Hz 디스플레이에서는 같은 프레임을 두 번 그린다.

픽셀아트에서는 이게 오히려 유리하다. 보간된 소수점 위치를 어차피 `Math.round`로 스냅해야 하므로, 보간의 이득이 대부분 사라진다. 복잡도만 늘고 결정론 디버깅 표면적이 넓어진다. 필요해지면 그때 추가한다.

---

## 9. 성능 예산과 계측

| 항목 | 예산 |
|---|---|
| 로직 (`world.step`) | ≤ 6ms |
| 렌더 (`renderer.draw`) | ≤ 8ms |
| 여유 | ≥ 2.6ms |
| 프레임 총합 | ≤ 16.6ms |

**내장 프로파일러 (개발 빌드 전용)**

시스템별 소요 시간을 링 버퍼에 기록하고 `~` 키로 오버레이 토글. 어느 시스템이 예산을 먹는지 즉시 보이지 않으면 최적화는 추측이 된다.

```ts
// 프로덕션 빌드에서는 tree-shaking으로 완전 제거
if (__DEV__) profiler.mark('collision');
```

**M0 성능 프로토타입 합격 기준**

| 환경 | 조건 | 기준 |
|---|---|---|
| PC (중급 노트북, Chrome) | 적 800 + 투사체 400 | 60 FPS 유지 |
| 모바일 (중급 안드로이드, Chrome) | 적 400 + 투사체 200 | 45 FPS 이상, p10 ≥ 40 |

미달 시 `WebGLRenderer`(PixiJS) 구현으로 전환하고, 이 문서의 §8을 개정한다. §1~§7은 렌더러와 무관하므로 그대로 유효하다 — 그게 §3.2에서 인터페이스를 분리한 이유다.

---

## 10. 코딩 규약 (게임 코드 한정)

- **핫 패스에서 할당 금지.** `world.step()` 호출 경로에서 객체 리터럴, 배열 리터럴, 클로저, 구조분해로 인한 임시 객체를 만들지 않는다. GC 스파이크는 60FPS의 가장 흔한 적이다.
- **벡터는 객체가 아니라 인자로.** `move(v: Vec2)` ❌ → `move(x: number, y: number)` ✅. 반환이 필요하면 out 파라미터나 모듈 스코프 스크래치 변수를 쓴다.
- **시간은 프레임 정수.** 변수명에 단위를 박는다: `cooldownFrames`, `durationFrames`.
- **매직 넘버 금지.** 밸런스 수치는 `game/content`로, 구조적 상수는 `game/core/constants.ts`로.
- **시스템 파일은 번호 접두사.** `50-enemy-separation.ts`. 실행 순서가 파일 목록에서 바로 보인다.
- 게임 코드에는 `async`/`Promise`를 쓰지 않는다 (에셋 로딩 제외). 시뮬레이션은 동기다.

---

## 11. 테스트 전략

| 종류 | 대상 | 실행 |
|---|---|---|
| 결정론 | 같은 시드+입력 → 같은 해시 | 매 커밋 (CI) |
| 골든 리플레이 | 저장된 5~10개 리플레이 회귀 | 매 커밋 (CI) |
| 단위 | fixedmath 정확도, 그리드 삽입/조회, 델타 인코딩 왕복 | 매 커밋 |
| 밸런스 시뮬 | 헤드리스 1000판 → 생존율·레벨·빌드 분포 | 수동 / 야간 |
| 성능 회귀 | 벤치 씬 프레임 타임 | 야간 |
| 에셋 검수 | 팔레트 이탈·반투명·규격 (PRD §6.4) | 매 커밋 (CI) |

**밸런스 시뮬이 1인 개발에서 특히 중요하다.** 혼자서는 밸런스 데이터를 손으로 모을 수 없다. AI 플레이어(단순 카이팅 봇 + 랜덤 카드 선택)로 1000판을 돌려 "어떤 무기가 선택되면 생존율이 오르는가"를 뽑으면, 감이 아니라 분포를 보고 튜닝할 수 있다. 결정론 시뮬이 이걸 가능하게 한다.

---

## 12. 미결 / 후속 결정

| # | 항목 | 결정 시점 |
|---|---|---|
| T1 | 오디오 아키텍처 (Web Audio, 동시 재생 상한, 결정론 무관 확인) | M3 |
| T2 | 에셋 로딩 전략 (아틀라스 프리로드 vs 스테이지별 지연 로드) | M2 |
| T3 | 세이브 데이터 마이그레이션 정책 (`PlayerProfile.version` 규칙) | M4 |
| T4 | 서버 헤드리스 시뮬 실행 환경 (Vercel Function 타임아웃 vs 별도 워커) | M6 |
| T5 | `engineVersion` 부여 규칙 (수동 bump vs 시스템 코드 해시) | M1 |
