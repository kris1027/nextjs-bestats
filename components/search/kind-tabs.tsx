import type { JSX } from 'react';

import { LinkTabs } from '@/components/navigation/link-tabs';
import { KIND_WORDS, KINDS, type Kind, type Search } from '@/lib/media';

/**
 * The search page's two tabs, one per Kind, on `LinkTabs`. Both Kinds'
 * Matches are already fetched, so both counts are shown: a Query's best
 * answer can sit behind the closed tab, and the count is the only thing that
 * says so. An unanswered Kind wears the dash. Without `search` the tabs are
 * the fallback the Matches stream into: real links, the counts not yet.
 *
 * They replace rather than push, so the page's `Back` returns to trending
 * rather than to whichever tab was open before.
 * — `docs/adr/0004-search-is-two-searches.md`
 */
const KindTabs = ({
  query,
  selected,
  search,
}: {
  query: string;
  selected: Kind;
  search?: Search;
}): JSX.Element => (
  // Labelled with the two words the reader sees rather than with "Kind":
  // Kind is the glossary's word for the distinction, not a word a visitor
  // hearing this nav announced would recognise.
  <LinkTabs
    label='Shows or movies'
    replace
    tabs={KINDS.map((kind) => ({
      href: `/search?q=${encodeURIComponent(query)}&kind=${kind}`,
      label: KIND_WORDS[kind].label,
      selected: kind === selected,
      tally: search && (search[kind]?.total ?? null),
    }))}
  />
);

export { KindTabs };
