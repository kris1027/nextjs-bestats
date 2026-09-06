import Image from 'next/image';
import Link from 'next/link';
import { type JSX, Suspense } from 'react';

import { viewer } from '@/lib/auth';
import { signOut } from '@/lib/auth-actions';

const control =
  'inline-flex items-center gap-2 border border-foreground/40 px-3 py-1.5 font-extrabold text-foreground text-xs leading-[1.2] transition-colors hover:bg-foreground/7 active:bg-foreground/14';

/**
 * The only part of the header that depends on who is asking. It is a component
 * of its own, behind a Suspense boundary, so the request-dependent half of the
 * header is a named seam rather than a property of the whole app: the pages
 * `docs/v1-plan.md` calls "unchanged and public" stay that way as far as the
 * renderer allows.
 */
const ViewerControl = async (): Promise<JSX.Element> => {
  const currentViewer = await viewer();

  if (!currentViewer) {
    // no `?next=` here: a server component cannot read the current path, and
    // the controls that can supply one arrive in step 4
    return (
      <Link href='/sign-in' className={control}>
        Sign in
      </Link>
    );
  }

  return (
    <div className='flex items-center gap-3'>
      {currentViewer.image ? (
        <Image
          src={currentViewer.image}
          // decorative: the name sits beside it
          alt=''
          width={24}
          height={24}
          className='rounded-full'
        />
      ) : null}
      <span className='max-w-[14ch] truncate font-extrabold text-sm sm:max-w-none'>
        {currentViewer.name}
      </span>
      {/* a Server Action, so the first client component in the app is still
          the marking control in step 4 */}
      <form action={signOut}>
        <button type='submit' className={control}>
          Sign out
        </button>
      </form>
    </div>
  );
};

/**
 * The app had no header until a Viewer existed to put in one. It reads the
 * Viewer through `lib/auth`'s helper and never a session of its own.
 * — `docs/adr/0005-the-viewer-lives-beside-the-domain.md`
 */
const SiteHeader = (): JSX.Element => (
  <header className='flex items-center justify-between gap-4 border-foreground/20 border-b px-4 py-3'>
    <Link
      href='/'
      className='font-extrabold text-base leading-none tracking-tight'
    >
      BeStats
    </Link>

    <Suspense fallback={<span className='h-[26px]' />}>
      <ViewerControl />
    </Suspense>
  </header>
);

export { SiteHeader };
