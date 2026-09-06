import type { JSX } from 'react';

import { control } from '@/lib/utils';

/**
 * The settings page's shape while who is signed in is checked: the heading
 * and the section's, which are the same for every Viewer, and blocks where
 * the name, the counts and the form go. Everything on the page follows that
 * check, so this is the whole page's fallback rather than a boundary inside
 * it.
 */
const SettingsLoading = (): JSX.Element => (
  <main className='flex-1 p-4'>
    <output aria-busy='true' className='sr-only'>
      Loading
    </output>
    <div
      aria-hidden='true'
      className='mx-auto flex w-full max-w-xl flex-col gap-8 py-4'
    >
      <h1 className='font-black text-3xl leading-[1.05]'>Settings</h1>

      <div className='flex items-center gap-3'>
        <div className='size-10 shrink-0 animate-pulse rounded-full bg-muted' />
        <div className='flex flex-col gap-1'>
          <div className='h-4 w-20 animate-pulse bg-muted' />
          <div className='h-5 w-32 animate-pulse bg-muted' />
        </div>
      </div>

      <section className='flex flex-col gap-4 border-destructive/40 border-t pt-6'>
        <h2 className='font-extrabold text-xl leading-[1.2]'>Leave BeStats</h2>
        <div className='flex max-w-[62ch] flex-col gap-2'>
          <div className='h-4 animate-pulse bg-muted' />
          <div className='h-4 animate-pulse bg-muted' />
          <div className='h-4 w-1/2 animate-pulse bg-muted' />
        </div>
        <div className='flex flex-col gap-4'>
          <div className='h-5 w-64 animate-pulse bg-muted' />
          <div className={`${control} invisible self-start`}>
            Delete everything
          </div>
        </div>
      </section>
    </div>
  </main>
);

export default SettingsLoading;
