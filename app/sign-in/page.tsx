import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { JSX } from 'react';

import { BackButton } from '@/components/ui/back-button';
import { viewer } from '@/lib/auth';
import { signIn } from '@/lib/auth-actions';
import { nextPath } from '@/lib/next-path';
import type { SearchParams } from '@/lib/search-params';
import { cn, control } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Sign in to BeStats to record what you mean to watch and what you have watched',
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

        {/* a plain form, not next/form: this posts to a Server Action rather
            than navigating, so there is no document reload to intercept */}
        <form action={signIn}>
          <input type='hidden' name='next' value={next} />
          <button
            type='submit'
            className={cn(control, 'w-full justify-center')}
          >
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  );
};

export default SignInPage;
