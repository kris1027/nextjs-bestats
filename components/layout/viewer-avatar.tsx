import Image from 'next/image';
import type { JSX } from 'react';

import type { Viewer } from '@/lib/auth';
import { initials } from '@/lib/format';

/** The square it renders at, in the header and so far nowhere else. A second
 * caller that wants another size is what turns this back into a prop. The
 * monogram's `size-6` is the same 24px, said the way Tailwind says it. */
const SIZE = 24;

/**
 * A Viewer's picture as their provider serves it, or their initials when
 * their provider served none. Decorative either way — the Viewer's name sits
 * beside it — so the picture's alt text is empty and the monogram is hidden
 * from a screen reader outright.
 *
 * It renders something for every Viewer rather than nothing for some. A
 * provider that supplies no picture is ordinary, and this is the one mark in
 * the header that stands for the Viewer rather than for what they can press.
 */
const ViewerAvatar = ({ viewer }: { viewer: Viewer }): JSX.Element =>
  viewer.image ? (
    <Image
      src={viewer.image}
      alt=''
      width={SIZE}
      height={SIZE}
      className='rounded-full'
    />
  ) : (
    <span
      aria-hidden='true'
      className='inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary font-extrabold text-[10px] text-primary-foreground leading-none'
    >
      {initials(viewer.name)}
    </span>
  );

export { ViewerAvatar };
