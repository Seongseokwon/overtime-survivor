'use client';

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
  choices: string[] | null;
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
  const { hp, maxHp, level, xp, xpToNext, seconds, kills, enemies, fps, choices } = snapshot;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, padding: '10px 12px',
        fontFamily: 'ui-monospace, monospace', fontSize: 11, pointerEvents: 'none',
        background: 'linear-gradient(#0d0f14dd, #0d0f1400)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c8d0dc' }}>
          <span>Lv.{level}</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{mm}:{ss}</span>
          <span>{kills} kills</span>
        </div>
        <Bar value={xp} max={xpToNext} color="#1f6feb" />
        <Bar value={hp} max={maxHp} color="#f85149" />
        <div style={{ color: '#3d4653', marginTop: 4 }}>적 {enemies} · {fps} FPS</div>
      </div>

      {choices && (
        <div style={{
          position: 'fixed', inset: 0, background: '#0d0f14cc',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: 16, gap: 8, fontFamily: 'ui-monospace, monospace',
        }}>
          <div style={{ color: '#ffe08a', fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
            LEVEL {level}
          </div>
          {choices.map((name, i) => (
            <button
              key={`${name}-${i}`}
              onClick={() => onChoose(i)}
              style={{
                background: '#1c2230', color: '#c8d0dc', border: '1px solid #2e3746',
                borderRadius: 8, padding: '16px 12px', font: 'inherit', fontSize: 14,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div style={{ height: 4, background: '#1c2230', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color }} />
    </div>
  );
}
