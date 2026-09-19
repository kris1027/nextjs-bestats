import type { Metadata } from 'next';
import './globals.css';
import type { JSX } from 'react';

import { SiteHeader } from '@/components/layout/site-header';
import { sans } from '@/lib/fonts';
import { LOCALE } from '@/lib/format';
import { cn } from '@/lib/utils';

// Vercel names the production domain at build and at run time, bare; off
// Vercel the app is on a developer's machine, where `next dev` listens
const origin = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const metadata: Metadata = {
  metadataBase: new URL(origin ? `https://${origin}` : 'http://localhost:3000'),
  title: {
    default: 'BeStats',
    // detail pages set only their own label; this frames it
    template: '%s · BeStats',
  },
  description:
    'Become a statistic — track the shows and movies you watch. Data from TMDB',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html
      lang={LOCALE}
      className={cn(
        // Light block is intentionally parked for a future theme toggle
        'dark',
        'h-full',
        'antialiased',
        sans.variable,
      )}
    >
      <body className='min-h-full flex flex-col'>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
