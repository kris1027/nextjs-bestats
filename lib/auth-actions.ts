'use server';

import { redirect } from 'next/navigation';

import { auth, isProvider } from '@/lib/auth';
import { nextPath, signedInAddress } from '@/lib/next-path';

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
