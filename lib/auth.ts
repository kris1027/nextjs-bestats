import { createNeonAuth } from '@neondatabase/auth/next/server';

/**
 * Neon's Managed Better Auth, and the only module that sees the session it
 * hands back. Viewers live in the `neon_auth` schema of this same database,
 * which is what lets `watch_records.viewer_id` be a real foreign key rather
 * than an id we hope still refers to someone.
 * — `docs/adr/0005-the-viewer-lives-beside-the-domain.md`
 *
 * `viewer()` below is where the glossary's word takes over, so `app/` and
 * `components/` never read a `user` of their own.
 *
 * Configuration is read leniently rather than asserted, because this module is
 * reached from the root layout. Throwing on a missing key would take the
 * public half of the app — Trending, search, detail pages, none of which know
 * a Viewer exists — down with the configuration of sign-in.
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL ?? '',
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET ?? '' },
});

/** The ways in. Email is deferred to v2, along with the delivery it needs. */
export const PROVIDERS = ['google', 'github'] as const;

export type Provider = (typeof PROVIDERS)[number];

/** Guards the provider name, which reaches the action as an opaque string. */
export const isProvider = (value: string): value is Provider =>
  PROVIDERS.some((provider) => provider === value);

/**
 * The ways deleting a Viewer can be refused, as `/settings?error=` spells
 * them: `stale` for a session older than Better Auth's freshness window,
 * `failed` for anything else. Listed here, beside the providers, because the
 * action sends one and the page reads one, and neither may invent a third.
 */
export const DELETION_REFUSALS = ['stale', 'failed'] as const;

export type DeletionRefusal = (typeof DELETION_REFUSALS)[number];

/** Guards the refusal, which reaches the page as an opaque query string. */
export const isDeletionRefusal = (value: string): value is DeletionRefusal =>
  DELETION_REFUSALS.some((refusal) => refusal === value);

/** A Viewer, as much of one as anything outside this module needs. */
export type Viewer = {
  id: string;
  name: string;
  image: string | null;
};

/**
 * The Viewer this request belongs to, or `null` for a Visitor who has not
 * signed in — which is an ordinary state and not an error. This is the only
 * way `app/` and `components/` may ask.
 */
export const viewer = async (): Promise<Viewer | null> => {
  const { data: session } = await auth.getSession();

  if (!session?.user) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    image: session.user.image ?? null,
  };
};
