import Link from 'next/link';
import { type JSX, Suspense } from 'react';

import { ListLinks } from '@/components/layout/list-links';
import { SignInLink } from '@/components/layout/sign-in-link';
import { ViewerAvatar } from '@/components/layout/viewer-avatar';
import { answeredViewer } from '@/lib/auth';
import { signOut } from '@/lib/auth-actions';

const control =
  'inline-flex items-center gap-2 border border-foreground/40 px-3 py-1.5 font-extrabold text-foreground text-xs leading-[1.2] transition-colors hover:bg-foreground/7 active:bg-foreground/14';

/**
 * The only part of the header that depends on who is asking. It is a component
 * of its own, behind a Suspense boundary, so the request-dependent half of the
 * header is a named seam rather than a property of the whole app: Trending,
 * search and the detail pages stay public as far as the renderer allows.
 *
 * Nothing at all when the sign-in went Unanswered: "Sign in" would tell a
 * Viewer they are not one, and the header's fixed height already holds the
 * space for nothing.
 */
const ViewerControl = async (): Promise<JSX.Element | null> => {
  const asked = await answeredViewer();

  if (asked.answer === 'unanswered') return null;

  // a client link, because only the client knows the address to come back to
  if (asked.answer === 'visitor') return <SignInLink className={control} />;

  const currentViewer = asked.viewer;

  return (
    <div className='flex items-center gap-4'>
      <ListLinks />
      {/* who they are signed in as, and nothing to press: the name led to
          `/settings`, and that page went with the deletion it existed for
          — docs/adr/0012-a-viewer-cannot-delete-themselves.md */}
      <div className='flex items-center gap-3'>
        <ViewerAvatar viewer={currentViewer} />
        <span className='max-w-[14ch] truncate font-extrabold text-sm sm:max-w-none'>
          {currentViewer.name}
        </span>
      </div>
      {/* a form posting to a Server Action, so signing out works before
          hydration: the header's client components are the two that need
          the address, `ListLinks` and `SignInLink`, and this is not one */}
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
 *
 * The height is fixed rather than left to the content. The Viewer control
 * streams in after the first paint, and a header sized by its children grows
 * by the difference between the fallback and the control when it lands —
 * two pixels, under the threshold the Layout Instability API reports, and
 * enough to move every card on the page.
 */
const SiteHeader = (): JSX.Element => (
  <header className='flex h-14 items-center justify-between gap-4 border-foreground/20 border-b px-4'>
    <Link
      href='/'
      className='font-extrabold text-base leading-none tracking-tight'
    >
      BeStats
    </Link>

    {/* nothing to hold the space: the header's height does not depend on it */}
    <Suspense fallback={null}>
      <ViewerControl />
    </Suspense>
  </header>
);

export { SiteHeader };
