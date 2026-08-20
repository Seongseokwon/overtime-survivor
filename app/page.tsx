import Link from 'next/link';

export default function Home() {
  return (
    <main style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', gap: 20, fontFamily: 'ui-monospace, monospace',
    }}>
      <h1 style={{ fontSize: 28, margin: 0, letterSpacing: '-0.02em' }}>야근 서바이버즈</h1>
      <p style={{ color: '#6e7a8a', fontSize: 13, margin: 0, textAlign: 'center', lineHeight: 1.7 }}>
        자정이 지나면 사무실의 모든 사물이 당신을 공격한다.<br />
        해가 뜰 때까지 버텨라.
      </p>
      <Link href="/play" style={{
        background: '#1f6feb', color: '#fff', padding: '12px 28px', borderRadius: 8,
        textDecoration: 'none', fontWeight: 700, fontSize: 14,
      }}>
        출근하기
      </Link>
      <p style={{ color: '#3d4653', fontSize: 11, margin: 0 }}>M1 스캐폴딩 — 이동 + 자동공격 + 레벨업</p>
    </main>
  );
}
