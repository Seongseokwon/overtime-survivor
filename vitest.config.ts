import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node', // 시뮬레이션은 DOM 없이 돌아야 한다 (TDD §3.1)
  },
});
