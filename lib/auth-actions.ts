'use server';

import { redirect } from 'next/navigation';

import { auth, type DeletionRefusal, isProvider, viewer } from '@/lib/auth';
import { nextPath, signedInAddress, signInAddress } from '@/lib/next-path';

/**
 * Hands the Visitor to a provider and brings them back to `/signed-in`,
 * carrying the `?next=` they came with. That address and no other, because
 * completing a sign-in means exchanging the verifier the provider returns
 * with, and `proxy.ts` is the only thing that can make that exchange — so
 * the provider has to return to the one route the proxy is watching.
 * — `docs/adr/0011-a-sign-in-completes-at-one-route.md`
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

  const callbackURL = signedInAddress(
    nextPath(String(formData.get('next') ?? '')),
  );

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

/** Back to the page, saying why. Not exported: a `'use server'` file may
 * export only async functions. */
const refused = (refusal: DeletionRefusal): string =>
  `/settings?error=${refusal}`;

/**
 * Deletes the Viewer: the sign-in Neon holds, and through the foreign keys
 * every Watch Record and the marking tally. Through Neon's own door rather
 * than a `delete` of our own, because Neon owns the table — and its door has
 * a lock: Better Auth refuses a session older than its freshness window, so
 * a cookie taken yesterday cannot delete a Viewer today. That refusal is
 * what `?error=stale` reports; anything else is `?error=failed`, with the
 * cause in the server log.
 * — `docs/adr/0005-the-viewer-lives-beside-the-domain.md`
 *
 * The confirmation is checked here as well as by the browser's `required`,
 * because a form can be posted by anything.
 */
export const deleteViewer = async (formData: FormData): Promise<void> => {
  if (!(await viewer())) redirect(signInAddress('/settings'));

  if (formData.get('confirmed') !== 'yes') redirect('/settings');

  const { error } = await auth.deleteUser();

  if (error) {
    console.error('Deleting a Viewer failed:', error);

    // Neon's wrapper normalises Better Auth's SESSION_EXPIRED to this
    // spelling before handing it back; the upper-case one never arrives
    redirect(refused(error.code === 'session_expired' ? 'stale' : 'failed'));
  }

  // nothing to sign out of: the session went with the Viewer
  redirect('/');
};
