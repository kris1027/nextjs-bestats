import { auth } from '@/lib/auth';

/**
 * The one thing this proxy is here for: exchanging the verifier a provider
 * sends a Visitor back with for the session cookie that makes them a Viewer.
 * Neon's middleware is the only thing that can make that exchange, and it
 * protects every route it sees that is not on a skip list of its own — a
 * list this app cannot add to. So it sees `/signed-in` and nothing else.
 * — `docs/adr/0011-a-sign-in-completes-at-one-route.md`
 */
export default auth.middleware({ loginUrl: '/sign-in' });

export const config = { matcher: ['/signed-in'] };
