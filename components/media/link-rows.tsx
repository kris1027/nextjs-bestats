import Link from 'next/link';
import type { JSX } from 'react';

/** One row: where it goes, what it is called, and its Facts, if any. */
type LinkRow = {
  href: string;
  /** Drawn before the label and part of the link's name — an Episode's number. */
  number?: number;
  label: string;
  facts: string[];
};

/**
 * A column of links, one to a row, each wearing its Facts. What a Show's page
 * lists its seasons in and a season's page its Episodes: a grid is for
 * Artwork, and neither a season nor an Episode is recognised by its picture.
 *
 * The label and the Facts stack on a phone and sit side by side from `sm:`,
 * since a long Episode title beside a long date has no room at 320px.
 */
const LinkRows = ({
  label,
  rows,
}: {
  /** What a screen reader announces the list as. */
  label: string;
  rows: LinkRow[];
}): JSX.Element => (
  <ol
    aria-label={label}
    className='flex flex-col border-foreground/20 border-t'
  >
    {rows.map((row) => (
      <li key={row.href} className='border-foreground/20 border-b'>
        <Link
          href={row.href}
          className='flex flex-col gap-1 py-3 transition-colors hover:bg-foreground/7 active:bg-foreground/14 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4'
        >
          <span className='min-w-0 break-words font-extrabold'>
            {row.number === undefined ? null : (
              <span className='mr-2 tabular-nums opacity-60'>{row.number}</span>
            )}
            {row.label}
          </span>
          {row.facts.length > 0 ? (
            <span className='shrink-0 text-sm opacity-60'>
              {row.facts.join(' · ')}
            </span>
          ) : null}
        </Link>
      </li>
    ))}
  </ol>
);

export { LinkRows, type LinkRow };
