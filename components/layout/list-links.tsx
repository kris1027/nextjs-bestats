'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { JSX } from 'react';

import { Bookmark, CalendarClock, Check, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { LIST_NAMES, LISTS, type List } from '@/lib/watch';

/**
 * The icon each list wears where its word will not fit. The Watchlist and the
 * Watched list wear the two the marking control already spells the states
 * with, so the header reads as "what I bookmarked" and "what I checked off"
 * rather than as two new signs to learn. Upcoming is no state and has no
 * button to borrow from, so it wears a calendar.
 *
 * Mirrored from `BUTTONS` in `components/watch/marking-control.tsx` rather
 * than shared with it: that map also carries the words those buttons wear,
 * which are the state's words and not a list's — "Planned" against
 * "Watchlist". Nothing enforces the agreement, so change the one and change
 * the other.
 */
const ICONS: Record<List, LucideIcon> = {
  watchlist: Bookmark,
  upcoming: CalendarClock,
  watched: Check,
};

/**
 * The header's way to a Viewer's lists. A client component only so the
 * open list can say so with `aria-current`, which needs the pathname; a
 * Visitor never sees these, since the lists would only send them to sign in.
 *
 * Below `sm:` each link is its icon and the word is read but not drawn: the
 * words are more of a 288px row than the header has to give at the 320px
 * floor. `sr-only` rather than `hidden`, so the link keeps the accessible
 * name the word was giving it — an icon nobody can see the label of is not a
 * saving.
 *
 * The hit area is 28×44 rather than the icon's own 18px, and the three stand
 * edge to edge below `sm:`, so the icons are 10px apart and every pixel of
 * the row is a target. Width is what the row is short of — three at 32 with
 * gaps measured 322px of content in 288 — and height is free inside a 56px
 * header, so it is spent in full.
 * — `docs/adr/0014-the-narrow-header-gives-up-words.md`
 */
const ListLinks = (): JSX.Element => {
  const pathname = usePathname();

  return (
    <nav aria-label='Your lists' className='flex items-center sm:gap-3'>
      {LIST_NAMES.map((list) => {
        const { path, label } = LISTS[list];
        const Icon = ICONS[list];
        const open = pathname === path;

        return (
          <Link
            key={path}
            href={path}
            aria-current={open ? 'page' : undefined}
            className={cn(
              'inline-flex h-11 w-7 items-center justify-center font-extrabold text-sm leading-none transition-colors sm:h-auto sm:w-auto',
              open
                ? 'text-foreground'
                : 'text-foreground/60 hover:text-foreground',
            )}
          >
            <Icon size={18} aria-hidden='true' className='sm:hidden' />
            <span className='sr-only sm:not-sr-only'>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export { ListLinks };
