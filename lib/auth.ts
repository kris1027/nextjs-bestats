import { headers } from 'next/headers';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { oAuthProxy } from 'better-auth/plugins';

import { db } from '@/lib/db';
import * as schema from '@/lib/schema';

/**
 * Better Auth's half of the app, and the only module that sees the session it
 * hands back. Its tables and its `user` are spelled the way it spells them;
 * `viewer()` below is where the glossary's word takes over, so `app/` and
 * `components/` never read a `user` of their own.
 * — `docs/adr/0005-the-viewer-lives-beside-the-domain.md`
 *
 * `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are not passed here: Better Auth
 * reads both from the environment under exactly those names.
 *
 * Credentials are read leniently rather than asserted, because this module is
 * reached from the root layout. Throwing on a missing key would take the
 * public half of the app — Trending, search, detail pages, none of which know
 * a Viewer exists — down with the configuration of sign-in.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    },
  },
  // localhost and every preview deployment sign in through production's
  // callback, which is the only one either provider has registered
  trustedOrigins: [
    'http://localhost:3000',
    'https://nextjs-bestats-*.vercel.app',
  ],
  plugins: [
    oAuthProxy({
      productionURL: process.env.BETTER_AUTH_PRODUCTION_URL ?? '',
      secret: process.env.OAUTH_PROXY_SECRET ?? '',
    }),
    // must be last: it writes Better Auth's cookies into Next's cookie store
    nextCookies(),
  ],
});

/** The ways in. Email is deferred to v2, along with the delivery it needs. */
export const PROVIDERS = ['google', 'github'] as const;

export type Provider = (typeof PROVIDERS)[number];

/** Guards the provider name, which reaches the action as an opaque string. */
export const isProvider = (value: string): value is Provider =>
  PROVIDERS.some((provider) => provider === value);

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
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    image: session.user.image ?? null,
  };
};
