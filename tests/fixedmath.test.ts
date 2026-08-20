import { describe, it, expect } from 'vitest';
import { dSin, dCos, dAtan2, dLen, TAU, PI } from '../game/core/fixedmath';

describe('fixedmath', () => {
  it('dSin이 Math.sin에 충분히 근접한다 (오차 < 1e-6)', () => {
    let maxErr = 0;
    for (let i = 0; i < 10000; i++) {
      const a = (i / 10000) * TAU;
      maxErr = Math.max(maxErr, Math.abs(dSin(a) - Math.sin(a)));
    }
    expect(maxErr).toBeLessThan(1e-6);
  });

  it('dCos가 dSin과 위상 관계를 지킨다', () => {
    for (let i = 0; i < 100; i++) {
      const a = (i / 100) * TAU;
      expect(Math.abs(dCos(a) - Math.cos(a))).toBeLessThan(1e-6);
    }
  });

  it('sin^2 + cos^2 = 1', () => {
    for (let i = 0; i < 500; i++) {
      const a = (i / 500) * TAU;
      const s = dSin(a), c = dCos(a);
      expect(Math.abs(s * s + c * c - 1)).toBeLessThan(1e-5);
    }
  });

  it('dAtan2가 Math.atan2에 근접한다 (오차 < 0.002 rad)', () => {
    let maxErr = 0;
    for (let i = 0; i < 2000; i++) {
      const a = (i / 2000) * TAU - PI;
      const x = Math.cos(a) * (1 + (i % 7));
      const y = Math.sin(a) * (1 + (i % 5));
      let diff = Math.abs(dAtan2(y, x) - Math.atan2(y, x));
      if (diff > PI) diff = TAU - diff;
      maxErr = Math.max(maxErr, diff);
    }
    expect(maxErr).toBeLessThan(0.002);
  });

  it('원점에서 dAtan2는 0을 낸다 (NaN 방지)', () => {
    expect(dAtan2(0, 0)).toBe(0);
  });

  it('dLen은 피타고라스를 만족한다', () => {
    expect(dLen(3, 4)).toBe(5);
  });

  it('같은 입력은 항상 같은 출력 (결정론)', () => {
    const a = 1.2345;
    const first = dSin(a);
    for (let i = 0; i < 1000; i++) expect(dSin(a)).toBe(first);
  });
});
