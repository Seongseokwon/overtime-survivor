// @ts-check
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

/**
 * 규약을 문서로만 두면 3주 뒤에 깨진다.
 * TDD §1.5(결정론)와 §3.1(모듈 경계)을 린트로 못 박는다.
 */

const SIM_GLOBS = ['game/core/**/*.ts', 'game/ecs/**/*.ts', 'game/systems/**/*.ts', 'game/content/**/*.ts', 'game/replay/**/*.ts'];

const restrictedMath = [
  ['random', 'rng.next(RngStream.X) 를 사용할 것'],
  ['sin', 'fixedmath.dSin'],
  ['cos', 'fixedmath.dCos'],
  ['tan', 'fixedmath 사용'],
  ['atan2', 'fixedmath.dAtan2'],
  ['hypot', 'fixedmath.dLen'],
  ['pow', 'fixedmath 또는 곱셈 전개'],
  ['exp', 'fixedmath 사용'],
  ['log', 'fixedmath 사용'],
].map(([property, message]) => ({ object: 'Math', property, message: `TDD §1.3 — ${message}` }));

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', '**/*.mjs'] },

  ...tseslint.configs.recommended,

  // ── 시뮬레이션 코어: 결정론 규약 ──────────────────────────────
  {
    files: SIM_GLOBS,
    plugins: { import: importPlugin },
    rules: {
      'no-restricted-globals': ['error',
        { name: 'window', message: 'TDD §3.1 — 시뮬 코어는 Node 에서도 실행되어야 한다' },
        { name: 'document', message: 'TDD §3.1' },
        { name: 'navigator', message: 'TDD §3.1' },
        { name: 'performance', message: 'TDD §1.1 — 프레임 카운터를 쓸 것' },
      ],
      'no-restricted-properties': ['error', ...restrictedMath],
      'no-restricted-syntax': ['error',
        { selector: 'ForInStatement', message: 'TDD §1.4 — for...in 은 순서를 보장하지 않는다' },
        { selector: "NewExpression[callee.name='Date']", message: 'TDD §1.1 — 시뮬에서 시간 조회 금지' },
        { selector: "MemberExpression[object.name='Date']", message: 'TDD §1.1' },
      ],
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['react', 'react-dom', 'next', 'next/*'], message: 'TDD §3.1 — 시뮬 코어는 UI 를 모른다' },
          { group: ['../render/*', '../../render/*', '../input/keyboard', '../input/touch'],
            message: 'TDD §3.1 — 시뮬 코어는 렌더/DOM 입력을 모른다' },
        ],
      }],
    },
  },

  // fixedmath 만이 Math 초월함수를 직접 쓴다 — 예외를 한 파일로 가둔다
  {
    files: ['game/core/fixedmath.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },

  // loop.ts 는 rAF/performance 를 쓰는 브라우저 전용 파일이다
  {
    files: ['game/core/loop.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },

  // 렌더러 구현체는 DOM 을 쓴다
  {
    files: ['game/render/**/*.ts'],
    rules: { 'no-restricted-globals': 'off', 'no-restricted-properties': 'off' },
  },

  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
);
