import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Sudoku Atölyesi — Her yaşta bir keşif',
  description:
    'Çocuklardan yetişkinlere: farklı boyutlar, seviyeler, günlük bulmacalar ve iki kişilik Sudoku. Ücretsiz, reklamsız ve girişsiz.',
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
      <body>{children}</body>
    </html>
  );
}
