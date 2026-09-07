import { usePathname, useSearchParams } from 'next/navigation';

import { address } from '@/lib/next-path';

/**
 * The address the current page is at, for a `?next=` that should bring a
 * Visitor back to it. Only the client knows it — a server component cannot
 * read its own address — so this is a hook, and the two controls that need
 * it share it rather than each pairing the two router hooks by hand.
 *
 * `useSearchParams` needs a Suspense boundary above it, now that every route
 * prerenders a shell. The boundary each page draws around its own
 * request-time reads is the one that supplies it.
 * — `docs/adr/0010-the-shell-is-prerendered.md`
 */
export const useAddress = (): string =>
  address(usePathname(), useSearchParams().toString());
