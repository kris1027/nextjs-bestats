import type { JSX } from 'react';

import { BackButton } from '@/components/ui/back-button';
import { control } from '@/lib/utils';

/**
 * What a page that could not be built says, and the offer to try again. Its
 * own component because two boundaries draw it: `app/error.tsx` inside the
 * root layout, and `app/global-error.tsx` in place of it, when the layout was
 * what failed. Neither imports the other, since each is a file convention
 * Next reads on its own terms.
 */
const ErrorNotice = ({ retry }: { retry: () => void }): JSX.Element => (
  <main className='flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center'>
    <p className='font-extrabold text-primary-accent text-sm tracking-wide'>
      Something went wrong
    </p>
    <h1 className='font-black text-3xl leading-[1.05] lg:text-[40px]'>
      This page could not be built
    </h1>
    <p className='max-w-[48ch] opacity-60'>
      Something BeStats asked did not answer. Try again in a moment.
    </p>
    <div className='flex flex-wrap justify-center gap-3'>
      <button type='button' onClick={retry} className={control}>
        Try again
      </button>
      <BackButton href='/'>Back to trending</BackButton>
    </div>
  </main>
);

export { ErrorNotice };
