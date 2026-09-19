'use client';

import { Montserrat } from 'next/font/google';
import './globals.css';
import type { JSX } from 'react';

import { ErrorNotice } from '@/components/layout/error-notice';
import { LOCALE } from '@/lib/format';
import { cn } from '@/lib/utils';

const sans = Montserrat({ subsets: ['latin'], variable: '--font-sans' });

/**
 * The error page for when the root layout is what failed, which `error.tsx`
 * cannot catch because it renders inside that layout. Next draws this in the
 * layout's place, so it brings its own document, stylesheet and font, and
 * a React `<title>`, since a client boundary cannot export `metadata`. There
 * is no header: the header is part of what may have thrown.
 *
 * `retry` fetches the layout and the page again, as it does in `error.tsx`.
 */
const GlobalError = ({ retry }: { retry: () => void }): JSX.Element => (
  <html
    lang={LOCALE}
    className={cn('dark', 'h-full', 'antialiased', sans.variable)}
  >
    <body className='min-h-full flex flex-col'>
      <title>Something went wrong · BeStats</title>
      <ErrorNotice retry={retry} />
    </body>
  </html>
);

export default GlobalError;
