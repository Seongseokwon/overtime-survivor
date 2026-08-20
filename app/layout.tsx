import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '야근 서바이버즈',
  description: '자정이 지나면 사무실의 모든 사물이 당신을 공격한다.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0d0f14',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, background: '#0d0f14', color: '#c8d0dc', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
