'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { JSX, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Wraps the Viewer's name and avatar as the link to `/settings`. A client
 * component only so the link can say when it is the open page, which needs
 * the pathname.
 */
const SettingsLink = ({ children }: { children: ReactNode }): JSX.Element => {
  const open = usePathname() === '/settings';

  return (
    <Link
      href='/settings'
      aria-label='Settings'
      aria-current={open ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 transition-opacity hover:opacity-80',
        open && 'underline underline-offset-4',
      )}
    >
      {children}
    </Link>
  );
};

export { SettingsLink };
