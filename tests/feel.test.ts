import { describe, it, expect } from 'vitest';
import { createWorld, clearFx, spawnEnemy } from '../game/ecs/world';
import { stepWorld } from '../game/systems/pipeline';
import { applyChoice } from '../game/systems/140-levelup';
import { worldHash } from '../game/core/worldhash';
import { CONTENT } from '../game/content/pack';
import { DIR_NONE } from '../game/input/InputFrame';
import { playerDamage } from '../game/systems/100-collision';
import { statusEffects } from '../game/systems/160-status';

function run(seed: number, frames: number, consumeEvery: number) {
  const w = createWorld(seed, CONTENT);
  w.weapons.push({ defIndex: 0, level: 1, cooldown: 0 });
  for (let f = 0; f < frames; f++) {
    if (w.pendingChoice) applyChoice(w, 0);
    stepWorld(w, DIR_NONE);
    // 렌더가 이벤트를 소비하는 주기를 흉내낸다
    if (consumeEvery > 0 && f % consumeEvery === 0) clearFx(w);
  }
  return { hash: worldHash(w), kills: w.killCount, hp: w.player.hp };
}

describe('타격감 레이어가 시뮬레이션을 오염시키지 않는다', () => {
  it('FX 소비 주기가 달라도 월드 해시가 같다', () => {
    // 렌더 프레임레이트가 기기마다 달라 이벤트 소비 주기가 달라져도
    // 게임 결과는 동일해야 한다. 안 그러면 저사양 기기의 리플레이가
    // 서버 검증에서 전부 튕긴다.
    const a = run(0x51ee, 1800, 1);    // 매 프레임 소비 (60fps)
    const b = run(0x51ee, 1800, 3);    // 3프레임마다 (20fps)
    const c = run(0x51ee, 1800, 0);    // 아예 소비 안 함 (버퍼 포화)
    expect(b.hash).toBe(a.hash);
    expect(c.hash).toBe(a.hash);
    expect(b.kills).toBe(a.kills);
    expect(c.kills).toBe(a.kills);
  });

  it('히트스톱이 걸려도 재현성이 유지된다', () => {
    const a = run(0xbeef, 2400, 1);
    const b = run(0xbeef, 2400, 1);
    expect(a.hash).toBe(b.hash);
  });
});

describe('접촉 피해에 개체별 무적 타이머가 있다', () => {
  it('같은 적이 쿨다운 중에는 다시 때리지 못한다', () => {
    const w = createWorld(1, CONTENT);
    const def = CONTENT.enemies[0]!;
    // 적 10마리를 플레이어 위에 겹쳐 놓는다
    for (let i = 0; i < 10; i++) spawnEnemy(w, 0, w.player.x, w.player.y, def.hp);

    const hp0 = w.player.hp;
    playerDamage(w);
    const afterFirst = hp0 - w.player.hp;
    // 첫 프레임: 10마리가 각각 한 번씩
    expect(afterFirst).toBeCloseTo(def.contactDamage * 10, 5);

    // 다음 프레임: 전부 쿨다운 중이므로 피해 0
    statusEffects(w);
    const hp1 = w.player.hp;
    playerDamage(w);
    expect(w.player.hp).toBe(hp1);
  });

  it('쿨다운이 끝나면 다시 피해를 준다', () => {
    const w = createWorld(1, CONTENT);
    const def = CONTENT.enemies[0]!;
    spawnEnemy(w, 0, w.player.x, w.player.y, def.hp);

    playerDamage(w);
    const hpAfterFirst = w.player.hp;
    for (let f = 0; f < def.contactCooldown; f++) {
      statusEffects(w);
      playerDamage(w);
    }
    expect(w.player.hp).toBeLessThan(hpAfterFirst);
  });
});
