# 야근 서바이버즈 (Overtime Survivors)

자정이 지나면 사무실의 모든 사물이 당신을 공격한다. 8분짜리 뱀서라이크 웹 게임.

- 기획: `docs/PRD-overtime-survivors-v0.2.md`
- 기술 설계: `docs/TDD-overtime-survivors-v0.1.md`
- 셋업·아키텍처: `docs/SETUP-AND-ARCHITECTURE-v0.1.md`
- M0 성능 검증: `m0/` (종료 결정서: `docs/M0-CLOSURE.md`)

## 현재 상태 — M1 스캐폴딩 + 인턴 J 플레이테스트

동작하는 것: 이동(키보드·터치), 자동 공격, 적 스폰·추적, 충돌, 경험치 젬, 레벨업 3택, 무기 성장, 무기 합성, 인턴 J 캐릭터 보정.
아직 없는 것: 오버타임 게이지, 보스, 메타 진행, 백엔드.

캐릭터 적용 문서: `docs/CHARACTER-INTERN-J.md`

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # 결정론 + 단위 테스트
pnpm lint         # 결정론 규약 + 타입 검사
```

## 이 코드베이스의 규칙

### 1. 시뮬레이션은 결정론적이다

`game/core`, `game/ecs`, `game/systems`, `game/content`, `game/replay` 는
**같은 시드 + 같은 입력이면 어떤 기기에서도 비트 단위로 같은 결과**를 낸다.

이게 성립해야 서버 리플레이 검증(랭킹 치트 방지), 버그 재현, 헤드리스 밸런스 시뮬이 가능하다.
나중에 도입할 수 없는 성질이므로 처음부터 지킨다.

| 금지 | 대신 |
|---|---|
| `Math.random()` | `w.rng.next(RngStream.X)` |
| `Math.sin/cos/tan/atan2/pow/exp/log` | `game/core/fixedmath` |
| `Date.now()`, `performance.now()` | 프레임 카운터 (`w.frame`) |
| `for...in`, `Set`/`Map` 순회 | 인덱스 오름차순 배열 순회 |
| ms 단위 시간 | 프레임 정수 (`cooldownFrames: 48`) |
| React·DOM import | (시뮬 코어에서는 불가) |

전부 ESLint 로 강제된다. `pnpm lint` 가 잡는다.

> `Math.sqrt`, `Math.abs/floor/ceil/round/min/max/sign` 은 IEEE 754·명세가 결과를 정확히
> 규정하므로 안전하다. 위험한 건 "구현 근사"로 규정된 초월함수다.

### 2. 시뮬 코어는 브라우저를 모른다

서버가 같은 코드를 Node 에서 실행해 리플레이를 검증한다.
`game/render` 와 `game/core/loop.ts` 만이 DOM·rAF 를 쓴다.

### 3. 콘텐츠는 코드가 아니라 데이터다

무기·적·웨이브는 `game/content/pack.ts` 에 선언적으로 있다.
`schema.ts` 의 `validateContentPack()` 이 참조 무결성을 검사하고, 테스트에서 실행된다.

단, **데이터만으로 새 동작이 생기지는 않는다.** 새 `FireMode` 나 `EnemyBehavior` 를
추가하려면 스키마에 종류를 넣고 해당 시스템에 케이스를 추가해야 한다.

### 4. 시스템 실행 순서는 고정이다

`game/systems/pipeline.ts` 의 순서가 결정론과 게임 필 양쪽에 직결된다.
파일명 번호 접두사가 곧 실행 순서다. 바꾸면 `ENGINE_VERSION` 을 올리고 골든 리플레이를 갱신한다.

### 5. 핫 패스에서 할당하지 않는다

`stepWorld()` 경로에서 객체 리터럴·배열 리터럴·클로저를 만들지 않는다.
GC 스파이크는 60FPS 의 가장 흔한 적이다. 벡터는 객체가 아니라 `(x, y)` 인자로 넘긴다.

## 디렉터리

```
app/         Next.js 라우트
components/  React HUD·셸 (게임 상태를 30Hz 스냅샷으로만 구독)
game/
  core/      loop, rng, fixedmath, constants, worldhash
  ecs/       SoA 배열, 풀, 스폰·제거
  systems/   번호 순서대로 실행되는 시스템들
  content/   스키마 + 콘텐츠 팩
  render/    Renderer 인터페이스 + Canvas2D 구현
  input/     InputFrame 인코딩, 키보드, 터치
  replay/    입력 로그
tests/       결정론, fixedmath
m0/          성능 벤치마크 (별도 실행)
docs/        PRD, TDD, 셋업, M0 결정서
```

## 다음 작업 (M2)

- [ ] `tools/gen-sintable.ts` — sin 테이블을 상수로 사전 생성 (플랫폼 간 완전 동일성)
- [ ] 골든 리플레이 테스트 (`tests/golden/`)
- [ ] 적 행동 확장: ranged / charge / splitter
- [ ] 무기 발사 방식 확장: boomerang / orbit / aoe / trail
- [ ] Y 정렬 (셀 행 버킷 카운팅 소트)
- [ ] 접촉 무적 타이머 (개체별)
- [ ] 아트 파이프라인 (`tools/sprite-normalize`, `sprite-validate`, `atlas-build`)
