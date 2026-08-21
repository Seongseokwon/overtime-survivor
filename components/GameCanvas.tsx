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
import { ParticleField } from '../game/render/effects';
import { Sfx } from '../game/audio/sfx';
import { WORLD_W, WORLD_H, FPS } from '../game/core/constants';
import { InputLog } from '../game/replay/InputLog';
import type { World } from '../game/ecs/world';
import Hud, { type ChoiceCard, type HudSnapshot, type SlotView } from './Hud';

/**
 * 'fixed' 는 모든 기기가 같은 시야를 보지만(랭킹 공정성), 화면을 못 채운다.
 * iPhone(393x695)에서는 가로 31%가 여백으로 버려졌다 (M0 측정, TDD §2.2).
 * 랭킹이 없는 M1~M3 동안은 'fill' 로 두어 테스트 경험을 우선한다.
 * 엔드리스 랭킹이 붙는 M6 전에 최종 결정한다.
 */
const VIEWPORT_MODE: ViewportMode = 'fill';

/** 레벨업 카드에 표시할 정보를 만든다. */
function buildCards(world: World): ChoiceCard[] {
  const cards = world.pendingChoice ?? [];
  return cards.map((card): ChoiceCard => {
    if (card.kind === 'craft') {
      const recipe = CONTENT.recipes[card.recipeIndex]!;
      const out = CONTENT.weapons[world.recipeIndex[card.recipeIndex]!.outputDef]!;
      return {
        kind: 'craft',
        name: out.nameKo,
        desc: out.descKo,
        label: '합성',
        // 합성은 '새 무기 획득'과 다른 종류의 선택이다. is-new(파란) 스타일이
        // 금색 합성 스타일을 덮어쓰지 않도록 false 로 둔다.
        isNew: false,
        // 슬롯이 어떻게 바뀌는지 카드에서 바로 읽혀야 판단이 된다
        materials: recipe.inputs.map((i) => {
          const def = CONTENT.weapons.find((wd) => wd.id === i.weaponId)!;
          const owned = world.weapons.find((s) => s.defIndex === CONTENT.weapons.indexOf(def));
          return { name: def.nameKo, level: owned?.level ?? 0 };
        }),
      };
    }
    const def = CONTENT.weapons[card.defIndex]!;
    const owned = world.weapons.find((s) => s.defIndex === card.defIndex);
    const maxed = owned ? owned.level >= def.levels.length : false;
    return {
      kind: 'weapon',
      name: def.nameKo,
      desc: def.descKo,
      label: !owned ? 'NEW' : maxed ? 'MAX' : `Lv.${owned.level} → ${owned.level + 1}`,
      isNew: !owned,
    };
  });
}

/** HUD 에 띄울 현재 무기 슬롯. 합성 판단을 하려면 뭘 갖고 있는지 보여야 한다. */
function buildSlots(world: World): SlotView[] {
  return world.weapons.map((s) => {
    const def = CONTENT.weapons[s.defIndex]!;
    return { name: def.nameKo, level: s.level, tier: def.tier };
  });
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const resumeRef = useRef<() => void>(() => {});
  const [snapshot, setSnapshot] = useState<HudSnapshot>({
    hp: 100, maxHp: 100, level: 1, xp: 0, xpToNext: 5,
    seconds: 0, kills: 0, enemies: 0, fps: 0, choices: null, hitPulse: 0, slots: [],
    hitchPct: 0, paused: false, pausedByBlur: false,
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
    const sfx = new Sfx();

    // 브라우저는 사용자 제스처 이후에만 오디오를 열어준다
    const unlockAudio = (): void => sfx.resume();
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    let hitPulse = 0;

    /**
     * 일시정지.
     *
     * 브라우저는 탭이 숨겨지거나 창이 최소화되면 requestAnimationFrame 호출을
     * 멈춘다(명세대로다). 그래서 게임은 어차피 멈추는데, 아무 표시가 없으면
     * 플레이어는 "멈춘 건지 망가진 건지" 알 수 없다.
     * 그래서 명시적인 일시정지 상태로 승격시킨다.
     *
     * 자리를 비운 사이 죽지 않는 것은 이 장르에서 올바른 동작이다.
     * (랭킹이 붙는 엔드리스 모드에서는 정책이 달라질 수 있다 — M6에서 결정)
     */
    let paused = false;
    let pausedByBlur = false;

    const pause = (byBlur: boolean): void => {
      if (paused) return;
      paused = true; pausedByBlur = byBlur;
      sfx.suspend();
    };
    const resume = (): void => {
      if (!paused) return;
      paused = false; pausedByBlur = false;
      sfx.resume();
    };
    resumeRef.current = resume;

    const onVisibility = (): void => { if (document.hidden) pause(true); };
    const onBlur = (): void => pause(true);
    const onKey = (e: KeyboardEvent): void => {
      if (e.code !== 'Escape' && e.code !== 'KeyP') return;
      e.preventDefault();
      if (paused) resume(); else pause(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKey);

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

    let frameMsAccum = 0, frameSamples = 0, hudTick = 0, hitches = 0, totalFrames = 0;

    void renderer.init(canvas, vp.viewW, vp.viewH).then(() => {
      if (disposed) return;
      applyResize();
      window.addEventListener('resize', applyResize);

      stop = startLoop({
        step() {
          if (paused) return;
          const input = touch.state.active ? touch.sample() : keyboard.sample();
          log.record(world.frame, input);
          const levelBefore = world.player.level;
          stepWorld(world, input);
          if (world.player.level > levelBefore) sfx.play('levelUp');
        },
        render() {
          consumeFx();
          particles.update(1);
          sfx.tick(1);
          if (hitPulse > 0) hitPulse = Math.max(0, hitPulse - 0.04);
          const cam = cameraFor(world.player.x, world.player.y, vp.viewW, vp.viewH, WORLD_W, WORLD_H);
          drawWorld(world, renderer, cam.x, cam.y, vp.viewW, vp.viewH, particles);
        },
        onSample(frameMs, loopStats) {
          frameMsAccum += frameMs; frameSamples++;
          hitches = loopStats.hitches;
          totalFrames = loopStats.frames;
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
            slots: buildSlots(world),
            hitchPct: totalFrames > 0 ? (hitches / totalFrames) * 100 : 0,
            paused,
            pausedByBlur,
          });
          frameMsAccum = 0; frameSamples = 0;
        },
      });
    });

    // ── 개발 전용 디버그 훅 ──────────────────────────────
    // 빌드 특정 조합을 검증하려고 매번 5분씩 갈아 넣을 수는 없다.
    // 프로덕션 번들에서는 통째로 제거된다.
    if (process.env.NODE_ENV !== 'production') {
      const defIndexOf = (id: string): number => CONTENT.weapons.findIndex((wd) => wd.id === id);
      (window as unknown as { __os?: unknown }).__os = {
        world,
        /** 무기를 주거나 레벨을 맞춘다. 슬롯이 꽉 차면 무시된다. */
        give(id: string, level = 1): void {
          const d = defIndexOf(id);
          if (d < 0) return;
          const slot = world.weapons.find((sl) => sl.defIndex === d);
          if (slot) slot.level = level;
          else if (world.weapons.length < 5) world.weapons.push({ defIndex: d, level, cooldown: 0 });
        },
        clearWeapons(): void { world.weapons.length = 0; },
        /** 즉시 레벨업 카드를 띄운다 */
        levelUp(): void { world.player.xp = world.player.xpToNext; },
        addXp(n: number): void { world.player.xp += n; },
        godMode(): void { world.player.hp = 99999; world.player.maxHp = 99999; },
      };
    }

    return () => {
      disposed = true;
      stop?.();
      window.removeEventListener('resize', applyResize);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKey);
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
      <Hud snapshot={snapshot} onChoose={choose} onResume={() => resumeRef.current()} />
    </div>
  );
}
