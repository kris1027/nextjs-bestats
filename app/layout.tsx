import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import type { JSX } from 'react';

import { SiteHeader } from '@/components/layout/site-header';
import { LOCALE } from '@/lib/format';
import { cn } from '@/lib/utils';

const sans = Montserrat({ subsets: ['latin'], variable: '--font-sans' });

// the header reads the session, which depends on cookies
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
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
