import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import type { JSX } from 'react';

import { viewer } from '@/lib/auth';
import { deleteViewer } from '@/lib/auth-actions';
import { formatCount } from '@/lib/format';
import { firstValue, type SearchParams } from '@/lib/search-params';
import { cn, control } from '@/lib/utils';
import { watchTallies } from '@/lib/watch-queries';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Who you are signed in as, and how to leave',
};

/** What a refused deletion says, keyed by the `?error=` the action sends back. */
const ERRORS: Record<string, string> = {
  stale:
    'Your sign-in is too old to do this. Sign out, sign in again, and come back.',
  failed: 'That did not work. Try again in a moment.',
};

// `settings` is a static segment, so the standing rule about top-level
// routes holds — docs/adr/0001-one-route-serves-both-kinds.md
const SettingsPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> => {
  const currentViewer = await viewer();

  if (!currentViewer) redirect('/sign-in?next=%2Fsettings');

  const [tallies, params] = await Promise.all([
    watchTallies(currentViewer.id),
    searchParams,
  ]);
  const error = ERRORS[firstValue(params.error)];

  return (
    <main className='flex-1 p-4'>
      <div className='mx-auto flex w-full max-w-xl flex-col gap-8 py-4'>
        <h1 className='font-black text-3xl leading-[1.05]'>Settings</h1>

        <div className='flex items-center gap-3'>
          {currentViewer.image ? (
            <Image
              src={currentViewer.image}
              // decorative: the name sits beside it
              alt=''
              width={40}
              height={40}
              className='rounded-full'
            />
          ) : null}
          <div className='flex flex-col'>
            <span className='text-muted-foreground text-xs'>Signed in as</span>
            <span className='font-extrabold'>{currentViewer.name}</span>
          </div>
        </div>

        <section className='flex flex-col gap-4 border-destructive/40 border-t pt-6'>
          <h2 className='font-extrabold text-xl leading-[1.2]'>
            Leave BeStats
          </h2>
          <p className='max-w-[62ch] opacity-80'>
            This deletes your sign-in and every Watch Record you have made —{' '}
            {formatCount(tallies.planned, { one: 'planned', other: 'planned' })}
            ,{' '}
            {formatCount(tallies.watched, { one: 'watched', other: 'watched' })}
            . Nothing about you stays, and it cannot be undone.
          </p>
          {error ? (
            <p role='alert' className='text-destructive text-sm'>
              {error}
            </p>
          ) : null}
          {/* a plain form: this posts to a Server Action rather than
              navigating, and works before hydration */}
          <form action={deleteViewer} className='flex flex-col gap-4'>
            <label className='flex items-start gap-2 text-sm'>
              <input
                type='checkbox'
                name='confirmed'
                value='yes'
                required
                className='mt-0.5'
              />
              I understand this cannot be undone
            </label>
            <button
              type='submit'
              className={cn(
                control,
                'self-start border-destructive text-destructive hover:bg-destructive/10 active:bg-destructive/20',
              )}
            >
              Delete everything
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};

export default SettingsPage;
