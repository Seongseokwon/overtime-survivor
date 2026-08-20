'use client';

import { useEffect, useRef, useState } from 'react';
import { createWorld } from '../game/ecs/world';
import { stepWorld } from '../game/systems/pipeline';
import { applyChoice } from '../game/systems/140-levelup';
import { startLoop } from '../game/core/loop';
import { Canvas2DRenderer } from '../game/render/canvas2d/Canvas2DRenderer';
import { drawWorld } from '../game/render/drawWorld';
import { createKeyboardInput } from '../game/input/keyboard';
import { createTouchInput } from '../game/input/touch';
import { computeViewport, cameraFor, type ViewportMode } from '../game/viewport';
import { CONTENT } from '../game/content/pack';
import { WORLD_W, WORLD_H, FPS } from '../game/core/constants';
import { InputLog } from '../game/replay/InputLog';
import type { World } from '../game/ecs/world';
import Hud, { type HudSnapshot } from './Hud';

const VIEWPORT_MODE: ViewportMode = 'fixed';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const [snapshot, setSnapshot] = useState<HudSnapshot>({
    hp: 100, maxHp: 100, level: 1, xp: 0, xpToNext: 5,
    seconds: 0, kills: 0, enemies: 0, fps: 0, choices: null,
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
          stepWorld(world, input);
        },
        render() {
          const cam = cameraFor(world.player.x, world.player.y, vp.viewW, vp.viewH, WORLD_W, WORLD_H);
          drawWorld(world, renderer, cam.x, cam.y);
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
            choices: world.pendingChoice
              ? world.pendingChoice.map((i) => CONTENT.weapons[i]!.nameKo)
              : null,
          });
          frameMsAccum = 0; frameSamples = 0;
        },
      });
    });

    return () => {
      disposed = true;
      stop?.();
      window.removeEventListener('resize', applyResize);
      keyboard.dispose();
      touch.dispose();
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
