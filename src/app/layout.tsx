import type { Metadata, Viewport } from 'next';
import { Press_Start_2P, VT323 } from 'next/font/google';
import './globals.css';

const pixelFont = Press_Start_2P({
  weight: '400',
  variable: '--font-pixel',
  subsets: ['latin'],
});

const vt323Font = VT323({
  weight: '400',
  variable: '--font-mono-pixel',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'PixelCraft &bull; Retro Infinite Canvas',
  description:
    'Kanvas publik kolaboratif 1920 x 1080 bertema Retro Pixel Web. Setiap 1 piksel di mode makro adalah dunia mikro 1:1 berisi doodle dan pesan abadi.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${pixelFont.variable} ${vt323Font.variable} h-full antialiased`}
    >
      <body className="h-full w-full overflow-hidden bg-white text-black font-pixel select-none overscroll-none touch-none">
        {children}
      </body>
    </html>
  );
}
