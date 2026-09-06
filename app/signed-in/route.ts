import { redirect } from 'next/navigation';

import { nextPath } from '@/lib/next-path';

// `signed-in` is a static segment, so the standing rule about top-level
// routes holds — docs/adr/0001-one-route-serves-both-kinds.md

/**
 * Where a sign-in completes. By the time this runs `proxy.ts` has already
 * exchanged the verifier the provider sent the Visitor back with for the
 * session cookie that makes them a Viewer — or found nothing to exchange and
 * sent them to sign in again. So there is no Viewer to read here and nothing
 * to decide: what is left is the address they were reading when they left.
 * — `docs/adr/0011-a-sign-in-completes-at-one-route.md`
 *
 * A handler rather than a page, because a page would be a request-time read
 * of `searchParams` behind a Suspense boundary drawn around a redirect
 * nobody is ever there to see.
 * — `docs/adr/0010-the-shell-is-prerendered.md`
 */
export const GET = (request: Request): never => {
  const { searchParams } = new URL(request.url);

  // a destination and never an instruction, and this address arrives from
  // off-site, so it is read back the way the sign-in page reads it
  redirect(nextPath(searchParams.get('next') ?? undefined));
};
