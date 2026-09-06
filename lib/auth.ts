import { cache } from 'react';

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
 * What asking who this request belongs to comes back as. Three answers, the
 * shape `MediaAnswer` takes in `lib/media`: a Viewer, a Visitor, or
 * Unanswered — Neon Auth could not say, which is not a Visitor and is never
 * drawn as one. A Viewer whose sign-in could not be checked would otherwise
 * see "Sign in" in the header and cards claiming nothing is marked, and a
 * press would send them to sign in again.
 */
export type ViewerAnswer =
  | { answer: 'viewer'; viewer: Viewer }
  | { answer: 'visitor' }
  | { answer: 'unanswered' };

/**
 * Where an Unanswered sign-in's reason goes: the server log, and nowhere
 * downstream, the same as `lib/media` does for a TMDB request.
 */
const logUnanswered = (reason: unknown): void => {
  console.error('The sign-in went Unanswered:', reason);
};

/**
 * Asked once per request however many components ask, since the header and
 * the page both do. Neon's wrapper reports an unreachable server and an
 * upstream failure as an `error` rather than by throwing, so reading `data`
 * alone renders an outage as a Visitor; a 5xx there is Unanswered. A 4xx is
 * an answer about this request's cookie, and that answer is "a Visitor".
 */
const askViewer = cache(async (): Promise<ViewerAnswer> => {
  try {
    const { data: session, error } = await auth.getSession();

    if (error && error.status >= 500) {
      logUnanswered(error);

      return { answer: 'unanswered' };
    }

    if (!session?.user) return { answer: 'visitor' };

    return {
      answer: 'viewer',
      viewer: {
        id: session.user.id,
        name: session.user.name,
        image: session.user.image ?? null,
      },
    };
  } catch (cause) {
    logUnanswered(cause);

    return { answer: 'unanswered' };
  }
});

/**
 * Who this request belongs to, Unanswered included. For the header and the
 * public pages, which have a Visitor's rendering to fall back on: when the
 * sign-in went Unanswered they leave the Viewer's half out — no Viewer
 * control, no marking controls — the way a card already does when its Watch
 * Records went Unanswered, and render the rest.
 */
export const answeredViewer = (): Promise<ViewerAnswer> => askViewer();

/**
 * The Viewer this request belongs to, or `null` for a Visitor who has not
 * signed in — which is an ordinary state and not an error. This is the only
 * way `app/` and `components/` may ask, besides `answeredViewer` above.
 *
 * Throws when the sign-in went Unanswered. For the callers that cannot go
 * on without the answer — the lists, settings, sign-in — since they can
 * neither redirect nor render, and the error page's "Try again" is the
 * right offer for a source that may answer next time.
 */
export const viewer = async (): Promise<Viewer | null> => {
  const asked = await askViewer();

  if (asked.answer === 'unanswered') {
    throw new Error('The sign-in went Unanswered');
  }

  return asked.answer === 'viewer' ? asked.viewer : null;
};
