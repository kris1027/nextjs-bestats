import { usePathname, useSearchParams } from 'next/navigation';

import { address } from '@/lib/next-path';

/**
 * The address the current page is at, for a `?next=` that should bring a
 * Visitor back to it. Only the client knows it — a server component cannot
 * read its own address — so this is a hook, and the two controls that need
 * it share it rather than each pairing the two router hooks by hand.
 *
 * `useSearchParams` needs a Suspense boundary above it once a route renders
 * statically; today every route is dynamic, and step 7's boundaries around
 * the TMDB fetches will supply one.
 */
export const useAddress = (): string =>
  address(usePathname(), useSearchParams().toString());
