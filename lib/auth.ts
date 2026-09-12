import { cookies, headers } from 'next/headers';
import { cache } from 'react';

import { createNeonAuth } from '@neondatabase/auth/next/server';
import {
  createAuthServer,
  extractNeonAuthCookies,
  type RequestContext,
} from '@neondatabase/auth/server';

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
 * The two keys are read differently on purpose, and the `?? ''` on each means
 * a different thing. Nothing validates `baseUrl`, so an unset one fails later,
 * inside the request, and comes back as Unanswered — which is right, since an
 * auth host that cannot be reached is an outage and Unanswered is how this
 * module draws one. The public half of the app — Trending, search, detail
 * pages, none of which know a Viewer exists — goes on rendering.
 *
 * `cookies.secret` is not lenient and cannot be: `createNeonAuth` asserts it
 * at import, so an unset one takes the whole app down there. That is the
 * better failure. It is the one variable `neon checkout main` does not write,
 * so it is the one a fresh clone is missing, and stopping with a message that
 * names it beats serving an app nobody can sign in to. The `?? ''` is
 * delegation rather than lenience — it hands the assertion to the package so
 * the package's message is what a developer reads.
 * — `docs/adr/0013-local-development-shares-productions-branch.md`
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL ?? '',
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET ?? '' },
});

/**
 * The same upstream, read through a context that cannot write. Neon's Next
 * adapter gives every server method a `setCookie` of `cookieStore.set`, which
 * Next refuses while a page renders — so a session refresh, the one reply that
 * carries a `Set-Cookie`, took the Viewer's half of the app down once a day
 * until this existed.
 * — `docs/adr/0017-reading-the-session-never-writes-a-cookie.md`
 *
 * `auth` above keeps its writing context and every caller that needs one:
 * `signOut` clears the session cookie and `signIn.social` sets the challenge
 * cookie the verifier exchange looks for, so one instance for both jobs would
 * stop sign-in completing with nothing to show for it.
 *
 * No `sessionDataTtl`, because that number is read when the `session_data`
 * cookie is minted and this instance never mints one.
 */
const reader = createAuthServer({
  baseUrl: process.env.NEON_AUTH_BASE_URL ?? '',
  cookieSecret: process.env.NEON_AUTH_COOKIE_SECRET ?? '',
  // `createNextRequestContext` from `@neondatabase/auth/next/server`, copied
  // line for line and then given the one `setCookie` this module exists for:
  // it reads request cookies off the header store, and wants `cookies()` only
  // so that it can `set`. Everything else here is the adapter's, the `origin`
  // walk included, so an upgrade is diffed against that function rather than
  // reasoned about — nothing in the types or the tests sees it drift.
  context: async (): Promise<RequestContext> => {
    const headerStore = await headers();

    return {
      getCookies: () => extractNeonAuthCookies(headerStore),
      // Silent: a dropped refresh is this decision rather than a failure, and
      // it costs the Viewer nothing — the refresh keeps the same token and
      // only extends `expiresAt`, so the cookie the browser holds stays good.
      setCookie: () => {},
      getHeader: (name) => headerStore.get(name) ?? null,
      getOrigin: () =>
        headerStore.get('origin') ||
        headerStore.get('referer')?.split('/').slice(0, 3).join('/') ||
        '',
      getFramework: () => 'nextjs',
    };
  },
});

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
  // Outside the try, and before the reader reads the request at all: while a
  // route is being prerendered this promise hangs and then rejects, which is
  // how the renderer learns to take the Suspense fallback here. The reader's
  // own `headers()` would reject inside the try instead, with nothing between
  // it and us to catch it, and a catch of ours would log a build as an outage.
  await cookies();

  try {
    const { data: session, error } = await reader.getSession();

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
 * on without the answer — the lists and sign-in — since they can
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
