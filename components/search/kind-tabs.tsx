import Link from 'next/link';
import type { JSX } from 'react';

import type { Kind } from '@/lib/media';
import { cn } from '@/lib/utils';

const KINDS: { kind: Kind; label: string }[] = [
  { kind: 'tv', label: 'Shows' },
  { kind: 'movie', label: 'Movies' },
];

/**
 * Tabs drawn as links rather than as tab state. The selected Kind belongs in
 * the address, so a search can be shared as the list the sender meant; Base
 * UI's Tabs would hold that choice in the client and leave the URL saying
 * something else. Styled to match `components/ui/tabs.tsx` on purpose.
 *
 * The links replace rather than push: switching tab is a change of view on one
 * search, not a step of its own, and stacking those steps would leave `Back`
 * walking backwards through tab toggles.
 */
const KindTabs = ({
  query,
  selected,
}: {
  query: string;
  selected: Kind;
}): JSX.Element => {
  return (
    <nav
      aria-label='Kind'
      className='mx-auto inline-flex h-10 w-fit items-center justify-center bg-muted p-1'
    >
      {KINDS.map(({ kind, label }) => (
        <Link
          key={kind}
          href={`/search?q=${encodeURIComponent(query)}&kind=${kind}`}
          replace
          aria-current={kind === selected ? 'page' : undefined}
          className={cn(
            'inline-flex h-[calc(100%-1px)] items-center justify-center border border-transparent px-4 py-1.5 font-semibold text-foreground/60 text-xs uppercase tracking-wider transition-colors hover:text-foreground focus-visible:outline-1 focus-visible:outline-ring',
            kind === selected &&
              'bg-background text-foreground dark:border-input dark:bg-input/30',
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
};

export { KindTabs };
