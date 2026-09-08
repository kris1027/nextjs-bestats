import type { JSX } from 'react';

import { control } from '@/lib/utils';

/**
 * The sign-in page's shape while whether there is anything on it for this
 * Visitor is checked: the heading and the sentence, which never change, and
 * a block where the one button goes. The back link needs the address to
 * return to, which is the request-time read this waits on, so a block holds
 * its place.
 */
const SignInLoading = (): JSX.Element => (
  <main className='flex-1 p-4'>
    <output aria-busy='true' className='sr-only'>
      Loading
    </output>
    <div
      aria-hidden='true'
      className='mx-auto flex w-full max-w-sm flex-col gap-6 py-4'
    >
      <div className={`${control} invisible self-start`}>Back</div>

      <div className='flex flex-col gap-2'>
        <h1 className='font-extrabold text-xl leading-[1.2]'>
          Sign in to BeStats
        </h1>
        <p className='text-muted-foreground text-sm'>
          To record what you mean to watch, and what you have watched.
        </p>
      </div>

      {/* the div stands in for the button's <form>: control is inline-flex, so
          on the page it sits in a line box and takes that line's leading. A
          placeholder made a flex item directly is blockified and takes none,
          which is a few px shorter than what replaces it */}
      <div>
        <div
          className={`${control} w-full animate-pulse justify-center border-transparent bg-muted text-transparent`}
        >
          Continue
        </div>
      </div>
    </div>
  </main>
);

export default SignInLoading;
