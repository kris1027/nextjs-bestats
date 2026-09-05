import type { JSX } from 'react';

import { BackButton } from '@/components/ui/back-button';

const NotFound = (): JSX.Element => {
  return (
    <main className='flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center'>
      <p className='font-extrabold text-primary-accent text-sm tracking-wide'>
        404
      </p>
      <h1 className='font-black text-3xl leading-[1.05] lg:text-[40px]'>
        Nothing to see here
      </h1>
      <p className='max-w-[48ch] opacity-60'>
        TMDB has no show or movie at this address.
      </p>
      <BackButton href='/'>Back to trending</BackButton>
    </main>
  );
};

export default NotFound;
