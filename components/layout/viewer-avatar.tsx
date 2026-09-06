import Image from 'next/image';
import type { JSX } from 'react';

import type { Viewer } from '@/lib/auth';

/**
 * A Viewer's picture as their provider serves it, or nothing when they have
 * none. Decorative wherever it appears — the name sits beside it — so the
 * alt text is empty. `size` is the one thing the header and the settings
 * page disagree on.
 */
const ViewerAvatar = ({
  viewer,
  size,
}: {
  viewer: Viewer;
  size: number;
}): JSX.Element | null =>
  viewer.image ? (
    <Image
      src={viewer.image}
      alt=''
      width={size}
      height={size}
      className='rounded-full'
    />
  ) : null;

export { ViewerAvatar };
