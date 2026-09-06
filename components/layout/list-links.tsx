'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { JSX } from 'react';

import { cn } from '@/lib/utils';
import { LISTS, WATCH_STATES } from '@/lib/watch';

/**
 * The header's way to a Viewer's two lists. A client component only so the
 * open list can say so with `aria-current`, which needs the pathname; a
 * Visitor never sees these, since the lists would only send them to sign in.
 */
const ListLinks = (): JSX.Element => {
  const pathname = usePathname();

  return (
    <nav aria-label='Your lists' className='flex items-center gap-3'>
      {WATCH_STATES.map((state) => {
        const { path, label } = LISTS[state];
        const open = pathname === path;

        return (
          <Link
            key={path}
            href={path}
            aria-current={open ? 'page' : undefined}
            className={cn(
              'font-extrabold text-sm leading-none transition-colors',
              open
                ? 'text-foreground'
                : 'text-foreground/60 hover:text-foreground',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
};

export { ListLinks };
