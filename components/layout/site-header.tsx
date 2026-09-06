import Image from 'next/image';
import Link from 'next/link';
import type { JSX } from 'react';

import { viewer } from '@/lib/auth';
import { signOut } from '@/lib/auth-actions';

const control =
  'inline-flex items-center gap-2 border border-foreground/40 px-3 py-1.5 font-extrabold text-foreground text-xs leading-[1.2] transition-colors hover:bg-foreground/7 active:bg-foreground/14';

/**
 * The app had no header until a Viewer existed to put in one. It reads the
 * Viewer through `lib/auth`'s helper and never a session of its own.
 * — `docs/adr/0005-the-viewer-lives-beside-the-domain.md`
 */
const SiteHeader = async (): Promise<JSX.Element> => {
  const signedIn = await viewer();

  return (
    <header className='flex items-center justify-between gap-4 border-foreground/20 border-b px-4 py-3'>
      <Link
        href='/'
        className='font-extrabold text-base leading-none tracking-tight'
      >
        BeStats
      </Link>

      {signedIn ? (
        <div className='flex items-center gap-3'>
          {signedIn.image ? (
            <Image
              src={signedIn.image}
              // decorative: the name sits beside it
              alt=''
              width={24}
              height={24}
              className='rounded-full'
            />
          ) : null}
          <span className='max-w-[14ch] truncate font-extrabold text-sm sm:max-w-none'>
            {signedIn.name}
          </span>
          {/* a Server Action, so the first client component in the app is
              still the marking control in step 4 */}
          <form action={signOut}>
            <button type='submit' className={control}>
              Sign out
            </button>
          </form>
        </div>
      ) : (
        // no `?next=` here: a server component cannot read the current path,
        // and the controls that can supply one arrive in step 4
        <Link href='/sign-in' className={control}>
          Sign in
        </Link>
      )}
    </header>
  );
};

export { SiteHeader };
