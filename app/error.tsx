'use client';

import type { JSX } from 'react';

import { BackButton } from '@/components/ui/back-button';
import { control } from '@/lib/utils';

/**
 * The page for what nobody anticipated. The failures the glossary has a word
 * for never reach it: a TMDB request or a sign-in that went Unanswered is
 * rendered by the page that asked, with the rest of that page intact. What
 * arrives here is a page that could not be built at all — a list whose
 * Viewer could not be checked, the database refusing — so the offer is to
 * try again, since what did not answer may answer next time. One at the
 * root rather than one per route, because no route has anything of its own
 * to say about an unexpected failure.
 *
 * A client component, as Next requires of an error boundary; `reset` asks
 * the router to render the segment again.
 */
const ErrorPage = ({ reset }: { reset: () => void }): JSX.Element => (
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
      <button type='button' onClick={reset} className={control}>
        Try again
      </button>
      <BackButton href='/'>Back to trending</BackButton>
    </div>
  </main>
);

export default ErrorPage;
