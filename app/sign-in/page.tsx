import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { JSX } from 'react';

import { BackButton } from '@/components/ui/back-button';
import { PROVIDERS, type Provider, viewer } from '@/lib/auth';
import { signIn } from '@/lib/auth-actions';
import { nextPath } from '@/lib/next-path';

type SearchParams = { [key: string]: string | string[] | undefined };

export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Sign in to BeStats to record what you mean to watch and what you have watched',
};

const PROVIDER_LABELS: Record<Provider, string> = {
  google: 'Google',
  github: 'GitHub',
};

const SignInPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> => {
  const next = nextPath((await searchParams).next);

  // already a Viewer: there is nothing on this page for them
  if (await viewer()) redirect(next);

  return (
    <main className='flex-1 p-4'>
      <div className='mx-auto flex w-full max-w-sm flex-col gap-6 py-4'>
        <BackButton href={next} className='self-start'>
          Back
        </BackButton>

        <div className='flex flex-col gap-2'>
          <h1 className='font-extrabold text-xl leading-[1.2]'>
            Sign in to BeStats
          </h1>
          <p className='text-muted-foreground text-sm'>
            To record what you mean to watch, and what you have watched.
          </p>
        </div>

        <div className='flex flex-col gap-3'>
          {PROVIDERS.map((provider) => (
            // a plain form, not next/form: this posts to a Server Action
            // rather than navigating, so there is no document reload to
            // intercept
            <form key={provider} action={signIn}>
              <input type='hidden' name='provider' value={provider} />
              <input type='hidden' name='next' value={next} />
              <button
                type='submit'
                className='inline-flex w-full items-center justify-center gap-2 border border-foreground/40 px-3.5 py-2 font-extrabold text-foreground text-sm leading-[1.2] transition-colors hover:bg-foreground/7 active:bg-foreground/14'
              >
                Continue with {PROVIDER_LABELS[provider]}
              </button>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
};

export default SignInPage;
