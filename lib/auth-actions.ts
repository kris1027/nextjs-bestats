'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth, isProvider } from '@/lib/auth';
import { nextPath } from '@/lib/next-path';

/**
 * Hands the Visitor to a provider and brings them back to `?next=`.
 *
 * Better Auth builds the authorize URL server-side, so no client instance is
 * needed for this and none exists. `oAuthProxy` rewrites the `redirect_uri` to
 * production's callback whatever environment this runs in.
 * — `docs/adr/0009-every-environment-is-a-neon-branch.md`
 */
export const signIn = async (formData: FormData): Promise<void> => {
  const provider = String(formData.get('provider') ?? '');

  if (!isProvider(provider)) throw new Error(`Unknown provider: ${provider}`);

  const callbackURL = nextPath(String(formData.get('next') ?? ''));

  const { url } = await auth.api.signInSocial({
    body: {
      provider,
      callbackURL,
      errorCallbackURL: '/sign-in',
    },
    headers: await headers(),
  });

  if (!url) throw new Error(`No authorize URL from ${provider}`);

  // outside any try: redirect signals by throwing
  redirect(url);
};

/** Ends the session and returns the Viewer to being a Visitor. */
export const signOut = async (): Promise<void> => {
  await auth.api.signOut({ headers: await headers() });

  redirect('/');
};
