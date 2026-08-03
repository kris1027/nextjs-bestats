import type { Metadata } from 'next';
import { Montserrat, Raleway } from 'next/font/google';
import './globals.css';
import type { JSX } from 'react';

import { cn } from '@/lib/utils';

const headingFont = Montserrat({
  subsets: ['latin'],
  variable: '--font-heading',
});
const bodyFont = Raleway({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'BeStats',
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
      lang='en'
      className={cn(
        // Light block is intentionally parked for a future theme toggle
        'dark',
        'h-full',
        'antialiased',
        bodyFont.variable,
        headingFont.variable,
      )}
    >
      <body className='min-h-full flex flex-col'>{children}</body>
    </html>
  );
}
