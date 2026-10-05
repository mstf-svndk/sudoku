import type { Metadata } from 'next';
import { PwaUpdater } from '@/components/pwa-updater';
import './globals.css';
export const metadata: Metadata = {
  title: 'Zihin Atölyesi — Sudoku, SOS ve Kelime Avı',
  description:
    'Sudoku, SOS ve Kelime Avı: her yaşta düşünerek oyna. Ücretsiz, reklamsız ve girişsiz.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        <meta name="theme-color" content="#f17845" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}<PwaUpdater /></body>
    </html>
  );
}
