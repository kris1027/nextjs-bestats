import type { Metadata } from 'next';
import { Montserrat, Raleway } from 'next/font/google';
import './globals.css';
import type { JSX } from 'react';

import { cn } from '@/lib/utils';

const headingFont: ReturnType<typeof Montserrat<'--font-heading'>> = Montserrat(
  {
    subsets: ['latin'],
    variable: '--font-heading',
  },
);

const bodyFont: ReturnType<typeof Raleway<'--font-sans'>> = Raleway({
  subsets: ['latin'],
  variable: '--font-sans',
});
export const metadata: Metadata = {
  title: 'BeStats',
  description:
    'Zostań statystyką, zapisuj co oglądasz, w co grasz... Dane z TMDB',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html
      lang='pl'
      className={cn(
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
