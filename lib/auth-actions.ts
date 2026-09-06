'use server';

import { redirect } from 'next/navigation';

import { auth, isProvider, viewer } from '@/lib/auth';
import { nextPath } from '@/lib/next-path';

/**
 * Hands the Visitor to a provider and brings them back to `?next=`.
 *
 * Neon Auth builds the authorize URL server-side, so no client instance is
 * needed for this and none exists. Localhost is a trusted origin already, so
 * there is no proxying to arrange for development; a preview deployment needs
 * its URL added to the branch's trusted domains by hand.
 * — `docs/adr/0009-every-environment-is-a-neon-branch.md`
 */
export const signIn = async (formData: FormData): Promise<void> => {
  const provider = String(formData.get('provider') ?? '');

  if (!isProvider(provider)) throw new Error(`Unknown provider: ${provider}`);

  const callbackURL = nextPath(String(formData.get('next') ?? ''));

  const { data, error } = await auth.signIn.social({ provider, callbackURL });

  if (error) throw new Error(`${provider} sign-in failed: ${error.message}`);
  if (!data?.url) throw new Error(`No authorize URL from ${provider}`);

  // outside any try: redirect signals by throwing
  redirect(data.url);
};

/** Ends the session and returns the Viewer to being a Visitor. */
export const signOut = async (): Promise<void> => {
  await auth.signOut();

  redirect('/');
};

/**
 * Deletes the Viewer: the sign-in Neon holds, and through the foreign keys
 * every Watch Record and the marking tally. Through Neon's own door rather
 * than a `delete` of our own, because Neon owns the table — and its door has
 * a lock: Better Auth refuses a session older than its freshness window, so
 * a cookie taken yesterday cannot delete an account today. That refusal is
 * what `?error=stale` reports; anything else is `?error=failed`, with the
 * cause in the server log.
 * — `docs/adr/0005-the-viewer-lives-beside-the-domain.md`
 *
 * The confirmation is checked here as well as by the browser's `required`,
 * because a form can be posted by anything.
 */
export const deleteViewer = async (formData: FormData): Promise<void> => {
  if (!(await viewer())) redirect('/sign-in?next=%2Fsettings');

  if (formData.get('confirmed') !== 'yes') redirect('/settings');

  const { error } = await auth.deleteUser();

  if (error) {
    console.error('Deleting a Viewer failed:', error);

    // Neon's wrapper normalises Better Auth's SESSION_EXPIRED to this
    // spelling before handing it back; the upper-case one never arrives
    redirect(
      error.code === 'session_expired'
        ? '/settings?error=stale'
        : '/settings?error=failed',
    );
  }

  // nothing to sign out of: the session went with the Viewer
  redirect('/');
};
