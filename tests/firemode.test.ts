import { describe, it, expect } from 'vitest';
import {
  createWorld, spawnEnemy, spawnOrbit, spawnZone, spawnProjectile, ProjKind,
} from '../game/ecs/world';
import { stepWorld } from '../game/systems/pipeline';
import { applyChoice } from '../game/systems/140-levelup';
import { collision } from '../game/systems/100-collision';
import { zones } from '../game/systems/105-zones';
import { projectileMovement } from '../game/systems/90-projectile';
import { rebuildSpatialHash } from '../game/systems/70-spatial-hash';
import { worldHash } from '../game/core/worldhash';
import { CONTENT } from '../game/content/pack';
import { DIR_NONE, encodeDirection } from '../game/input/InputFrame';

const defIndexOf = (id: string): number => CONTENT.weapons.findIndex((w) => w.id === id);
const dist = (ax: number, ay: number, bx: number, by: number): number =>
  Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);

describe('궤도 (orbit)', () => {
  it('플레이어가 움직여도 궤도가 정확히 따라붙는다', () => {
    const w = createWorld(1, CONTENT);
    w.weapons.push({ defIndex: defIndexOf('umbrella'), level: 1, cooldown: 0 });

    const right = encodeDirection(1, 0);
    for (let f = 0; f < 120; f++) stepWorld(w, right);

    const orbits: number[] = [];
    for (let i = 0; i < w.pCount; i++) {
      if (w.pKind[i] === ProjKind.Orbit) {
        orbits.push(dist(w.pX[i]!, w.pY[i]!, w.player.x, w.player.y));
      }
    }
    expect(orbits.length).toBeGreaterThan(0);
    // 위치를 매 프레임 새로 계산하므로 반지름 오차가 거의 없어야 한다
    for (const d of orbits) expect(Math.abs(d - 34)).toBeLessThan(0.01);
  });

  it('재타격 쿨다운이 있어 같은 적을 매 프레임 때리지 않는다', () => {
    const w = createWorld(1, CONTENT);
    const def = CONTENT.enemies[3]!; // 복사기 — 체력이 높아 오래 버틴다
    spawnEnemy(w, 3, w.player.x + 34, w.player.y, 100000);
    spawnOrbit(w, 0, 0, 34, 600, 10);

    const hp0 = w.eHp[0]!;
    for (let f = 0; f < 60; f++) {
      rebuildSpatialHash(w);
      collision(w);
      projectileMovement(w); // 쿨다운 감쇠는 여기서 일어난다
    }
    const hits = (hp0 - w.eHp[0]!) / 10;
    expect(def.hp).toBeGreaterThan(0);
    // 60프레임 / 쿨다운 10 ≈ 6회. 쿨다운이 없으면 60회가 된다.
    expect(hits).toBeGreaterThan(2);
    expect(hits).toBeLessThan(12);
  });
});

describe('부메랑 (boomerang)', () => {
  it('멀어졌다가 플레이어에게 돌아온다', () => {
    const w = createWorld(1, CONTENT);
    spawnProjectile(w, w.player.x, w.player.y, 4, 0, 120, 3, 10, ProjKind.Boomerang);

    let maxDist = 0;
    let sawReturn = false;
    let prev = 0;
    for (let f = 0; f < 120 && w.pCount > 0; f++) {
      projectileMovement(w);
      if (w.pCount === 0) { sawReturn = true; break; } // 손에 닿아 소멸
      const d = dist(w.pX[0]!, w.pY[0]!, w.player.x, w.player.y);
      if (d > maxDist) maxDist = d;
      if (prev > 0 && d < prev && maxDist > 20) sawReturn = true;
      prev = d;
    }
    expect(maxDist).toBeGreaterThan(20);
    expect(sawReturn).toBe(true);
  });
});

describe('장판 (zone)', () => {
  it('매 프레임이 아니라 주기적으로만 피해를 준다', () => {
    const w = createWorld(1, CONTENT);
    spawnEnemy(w, 0, w.player.x, w.player.y, 100000);
    spawnZone(w, w.player.x, w.player.y, 30, 7, 600);

    const hp0 = w.eHp[0]!;
    for (let f = 0; f < 11; f++) { rebuildSpatialHash(w); zones(w); }
    expect(w.eHp[0]!).toBe(hp0); // 아직 첫 틱 전

    rebuildSpatialHash(w); zones(w); // 12프레임째
    expect(hp0 - w.eHp[0]!).toBeCloseTo(7, 5);

    for (let f = 0; f < 12; f++) { rebuildSpatialHash(w); zones(w); }
    expect(hp0 - w.eHp[0]!).toBeCloseTo(14, 5); // 두 번째 틱
  });

  it('반경 밖의 적은 맞지 않는다', () => {
    const w = createWorld(1, CONTENT);
    spawnEnemy(w, 0, w.player.x + 200, w.player.y, 100000);
    spawnZone(w, w.player.x, w.player.y, 30, 7, 600);

    const hp0 = w.eHp[0]!;
    for (let f = 0; f < 40; f++) { rebuildSpatialHash(w); zones(w); }
    expect(w.eHp[0]!).toBe(hp0);
  });
});

describe('발사 방식이 늘어나도 결정론은 유지된다', () => {
  it('모든 무기를 든 상태로 같은 시드 → 같은 해시', () => {
    const run = (): { hash: number; kills: number } => {
      const w = createWorld(0x9a1e, CONTENT);
      // 원형이 다른 무기를 한꺼번에 든다 — 궤도·장판·부메랑·광역이 모두 돈다
      for (const id of ['stapler', 'umbrella', 'highlighter', 'coffee', 'wireless_mouse']) {
        w.weapons.push({ defIndex: defIndexOf(id), level: 3, cooldown: 0 });
      }
      for (let f = 0; f < 3600; f++) {
        if (w.pendingChoice) applyChoice(w, 0);
        stepWorld(w, DIR_NONE);
      }
      return { hash: worldHash(w), kills: w.killCount };
    };
    const a = run();
    const b = run();
    expect(a.hash).toBe(b.hash);
    expect(a.kills).toBe(b.kills);
    expect(a.kills).toBeGreaterThan(50);
  });
});
