'use client';

import { useEffect, useRef, useState } from 'react';
import { createWorld, clearFx } from '../game/ecs/world';
import { stepWorld } from '../game/systems/pipeline';
import { applyChoice } from '../game/systems/140-levelup';
import { startLoop } from '../game/core/loop';
import { Canvas2DRenderer } from '../game/render/canvas2d/Canvas2DRenderer';
import { drawWorld } from '../game/render/drawWorld';
import { createKeyboardInput } from '../game/input/keyboard';
import { createTouchInput } from '../game/input/touch';
import { computeViewport, cameraFor, type ViewportMode } from '../game/viewport';
import { CONTENT } from '../game/content/pack';
import { DamagePopups, ParticleField } from '../game/render/effects';
import { Sfx } from '../game/audio/sfx';
import { WORLD_W, WORLD_H, FPS } from '../game/core/constants';
import { InputLog } from '../game/replay/InputLog';
import type { World } from '../game/ecs/world';
import Hud, { type ChoiceCard, type HudSnapshot } from './Hud';

/**
 * 'fixed' 는 모든 기기가 같은 시야를 보지만(랭킹 공정성), 화면을 못 채운다.
 * iPhone(393x695)에서는 가로 31%가 여백으로 버려졌다 (M0 측정, TDD §2.2).
 * 랭킹이 없는 M1~M3 동안은 'fill' 로 두어 테스트 경험을 우선한다.
 * 엔드리스 랭킹이 붙는 M6 전에 최종 결정한다.
 */
const VIEWPORT_MODE: ViewportMode = 'fill';

/** 레벨업 카드에 표시할 정보를 만든다. 무기를 이미 갖고 있으면 승급으로 보여준다. */
function buildCards(world: World): ChoiceCard[] {
  const cards = world.pendingChoice ?? [];
  return cards.map((defIndex) => {
    const def = CONTENT.weapons[defIndex]!;
    const owned = world.weapons.find((s) => s.defIndex === defIndex);
    const maxed = owned ? owned.level >= def.levels.length : false;
    return {
      name: def.nameKo,
      desc: def.descKo,
      label: !owned ? 'NEW' : maxed ? 'MAX' : `Lv.${owned.level} → ${owned.level + 1}`,
      isNew: !owned,
    };
  });
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const [snapshot, setSnapshot] = useState<HudSnapshot>({
    hp: 100, maxHp: 100, level: 1, xp: 0, xpToNext: 5,
    seconds: 0, kills: 0, enemies: 0, fps: 0, choices: null, hitPulse: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 시드는 나중에 서버가 발급한다 (PRD §10.5). 지금은 로컬 난수로 시작.
    const seed = (Math.random() * 0xffffffff) >>> 0;
    const world = createWorld(seed, CONTENT);
    world.weapons.push({ defIndex: 0, level: 1, cooldown: 0 });
    worldRef.current = world;

    const renderer = new Canvas2DRenderer();
    const keyboard = createKeyboardInput();
    const touch = createTouchInput(canvas);
    const log = new InputLog();
    const particles = new ParticleField();
    const popups = new DamagePopups();
    const sfx = new Sfx();

    // 브라우저는 사용자 제스처 이후에만 오디오를 열어준다
    const unlockAudio = (): void => sfx.resume();
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    let hitPulse = 0;

    /**
     * 시뮬이 남긴 이벤트를 렌더 이펙트와 소리로 옮긴다.
     * 여기서부터는 코스메틱 영역이라 Math.random 을 써도 된다.
     */
    const consumeFx = (): void => {
      const fx = world.fx;
      for (let i = 0; i < fx.deathN; i++) {
        particles.burst(fx.deathX[i]!, fx.deathY[i]!, 22);
      }
      for (let i = 0; i < fx.sparkN; i++) {
        particles.spark(fx.sparkX[i]!, fx.sparkY[i]!);
      }
      for (let i = 0; i < fx.dmgN; i++) {
        popups.add(fx.dmgX[i]!, fx.dmgY[i]!, fx.dmgAmt[i]!);
      }
      if (fx.sparkN > 0) sfx.play('hit');
      if (fx.killsPending >= 6) sfx.play('multikill');
      else if (fx.killsPending > 0) sfx.play('kill');
      if (fx.playerHit > 0) { sfx.play('playerHit'); hitPulse = 1; }
      clearFx(world);
    };

    let vp = computeViewport(window.innerWidth, window.innerHeight, VIEWPORT_MODE);
    let disposed = false;
    let stop: (() => void) | null = null;

    const applyResize = (): void => {
      vp = computeViewport(window.innerWidth, window.innerHeight, VIEWPORT_MODE);
      renderer.resize(vp.viewW, vp.viewH, vp.scale);
    };

    let frameMsAccum = 0, frameSamples = 0, hudTick = 0;

    void renderer.init(canvas, vp.viewW, vp.viewH).then(() => {
      if (disposed) return;
      applyResize();
      window.addEventListener('resize', applyResize);

      stop = startLoop({
        step() {
          const input = touch.state.active ? touch.sample() : keyboard.sample();
          log.record(world.frame, input);
          const levelBefore = world.player.level;
          stepWorld(world, input);
          if (world.player.level > levelBefore) sfx.play('levelUp');
        },
        render() {
          consumeFx();
          particles.update(1);
          popups.update(1);
          sfx.tick(1);
          if (hitPulse > 0) hitPulse = Math.max(0, hitPulse - 0.04);
          const cam = cameraFor(world.player.x, world.player.y, vp.viewW, vp.viewH, WORLD_W, WORLD_H);
          drawWorld(world, renderer, cam.x, cam.y, vp.viewW, vp.viewH, particles, popups);
        },
        onSample(frameMs) {
          frameMsAccum += frameMs; frameSamples++;
          // HUD는 게임 상태를 직접 구독하지 않는다. 30Hz로 throttle한 스냅샷만 받는다 (TDD §8.1)
          if (++hudTick % 20 !== 0) return;
          setSnapshot({
            hp: Math.ceil(world.player.hp), maxHp: world.player.maxHp,
            level: world.player.level, xp: world.player.xp, xpToNext: world.player.xpToNext,
            seconds: Math.floor(world.elapsedFrames / FPS),
            kills: world.killCount, enemies: world.eCount,
            fps: frameSamples > 0 ? Math.round(1000 / (frameMsAccum / frameSamples)) : 0,
            choices: world.pendingChoice ? buildCards(world) : null,
            hitPulse,
          });
          frameMsAccum = 0; frameSamples = 0;
        },
      });
    });

    return () => {
      disposed = true;
      stop?.();
      window.removeEventListener('resize', applyResize);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      keyboard.dispose();
      touch.dispose();
      sfx.dispose();
      renderer.destroy();
    };
  }, []);

  const choose = (index: number): void => {
    const w = worldRef.current;
    if (w) applyChoice(w, index);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: '#0d0f14',
      touchAction: 'none', userSelect: 'none',
    }}>
      <canvas
        ref={canvasRef}
        style={{ imageRendering: 'pixelated', display: 'block' }}
      />
      <Hud snapshot={snapshot} onChoose={choose} />
    </div>
  );
}
