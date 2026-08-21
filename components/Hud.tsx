'use client';

export interface ChoiceCard {
  /** 무기 이름 */
  name: string;
  /** 한 줄 설명 */
  desc: string;
  /** 'NEW' 또는 'Lv.2 → Lv.3' */
  label: string;
  isNew: boolean;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  seconds: number;
  kills: number;
  enemies: number;
  fps: number;
  choices: ChoiceCard[] | null;
  /** 0~1. 피격 직후 1이 되고 서서히 0으로 간다 */
  hitPulse: number;
}

/**
 * HUD는 DOM으로 그린다 (TDD §8.1).
 * 캔버스에 텍스트를 그리면 매 프레임 폰트 래스터화가 일어나 비싸고,
 * 접근성·다국어·폰트 렌더링을 전부 직접 해결해야 한다.
 */
export default function Hud({ snapshot, onChoose }: {
  snapshot: HudSnapshot;
  onChoose: (index: number) => void;
}) {
  const { hp, maxHp, level, xp, xpToNext, seconds, kills, enemies, fps, choices, hitPulse } = snapshot;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <>
      <style>{CSS}</style>

      {/*
        피격 피드백은 화면 가장자리만 붉게 물들인다.
        화면을 흔들면 "맞았다"는 전달되지만 어지러움이 따라온다.
        비네트는 카메라를 건드리지 않으면서 같은 정보를 준다.
      */}
      <div className="os-vignette" style={{ opacity: hitPulse * 0.85 }} aria-hidden />

      <div className="os-top">
        <div className="os-topRow">
          <span>Lv.{level}</span>
          <span className="os-clock">{mm}:{ss}</span>
          <span>{kills} kills</span>
        </div>
        <Bar value={xp} max={xpToNext} color="#1f6feb" />
        <Bar value={hp} max={maxHp} color="#f85149" />
        <div className="os-debug">적 {enemies} · {fps} FPS</div>
      </div>

      {choices && (
        <div className="os-overlay" role="dialog" aria-label="레벨업 보상 선택">
          <div className="os-levelTag">LEVEL {level}</div>
          <div className="os-cards">
            {choices.map((c, i) => (
              <button
                key={`${c.name}-${i}`}
                className={`os-card${c.isNew ? ' is-new' : ''}`}
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => onChoose(i)}
              >
                <span className="os-badge">{c.label}</span>
                <span className="os-cardName">{c.name}</span>
                <span className="os-cardDesc">{c.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="os-bar">
      <div style={{ width: `${pct}%`, height: '100%', background: color }} />
    </div>
  );
}

const CSS = `
.os-top {
  position: fixed; top: 0; left: 0; right: 0;
  padding: 10px 12px calc(10px + env(safe-area-inset-top, 0px));
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px;
  pointer-events: none;
  background: linear-gradient(#0d0f14dd, #0d0f1400);
  z-index: 10;
}
.os-topRow { display: flex; justify-content: space-between; color: #c8d0dc; align-items: baseline; }
.os-clock { font-size: 17px; font-weight: 700; letter-spacing: 0.02em; }
.os-bar { height: 4px; background: #1c2230; border-radius: 2px; margin-top: 5px; overflow: hidden; }
.os-debug { color: #3d4653; margin-top: 5px; }

.os-vignette {
  position: fixed; inset: 0; pointer-events: none; z-index: 15;
  box-shadow: inset 0 0 70px 12px rgba(248, 81, 73, 0.55);
  transition: opacity 90ms linear;
}

.os-overlay {
  position: fixed; inset: 0; z-index: 20;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; padding: 20px;
  background: radial-gradient(ellipse at center, #0d0f14e0 0%, #0d0f14f5 70%);
  backdrop-filter: blur(2px);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  animation: os-fade 140ms ease-out;
}
@keyframes os-fade { from { opacity: 0 } to { opacity: 1 } }

.os-levelTag {
  color: #ffe08a; font-size: 13px; font-weight: 700; letter-spacing: 0.22em;
  text-shadow: 0 0 14px #ffe08a55;
}

.os-cards { display: flex; gap: 12px; width: 100%; justify-content: center; align-items: stretch; }

.os-card {
  display: flex; flex-direction: column; gap: 8px;
  background: #151a24; border: 1px solid #2e3746; border-radius: 12px;
  padding: 16px 14px; text-align: left; cursor: pointer;
  font: inherit; color: #c8d0dc;
  box-shadow: 0 10px 30px #00000066;
  animation: os-pop 180ms cubic-bezier(.2,.9,.3,1.4) backwards;
  transition: transform 90ms ease, border-color 90ms ease, background 90ms ease;
}
@keyframes os-pop { from { opacity: 0; transform: translateY(14px) scale(.96) } to { opacity: 1; transform: none } }
.os-card:hover { border-color: #4a5568; background: #1a212d; }
.os-card:active { transform: scale(.97); }
.os-card.is-new { border-color: #1f6feb88; }

.os-badge {
  align-self: flex-start;
  font-size: 10px; letter-spacing: 0.1em; font-weight: 700;
  color: #8b949e; background: #1c2230; border-radius: 999px; padding: 3px 8px;
}
.os-card.is-new .os-badge { color: #a5d6ff; background: #1f6feb33; }
.os-cardName { font-size: 16px; font-weight: 700; color: #eef2f7; }
.os-cardDesc { font-size: 11px; line-height: 1.6; color: #8b949e; }

/* 가로 화면: 3장을 나란히 */
@media (orientation: landscape) {
  .os-cards { flex-direction: row; max-width: 620px; }
  .os-card { flex: 1 1 0; min-height: 150px; }
}
/* 세로 화면: 세로로 쌓되 엄지가 닿는 크기로 */
@media (orientation: portrait) {
  .os-cards { flex-direction: column; max-width: 360px; }
  .os-card { min-height: 78px; }
}
`;
