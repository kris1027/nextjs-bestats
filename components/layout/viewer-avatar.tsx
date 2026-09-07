import Image from 'next/image';
import type { JSX } from 'react';

import type { Viewer } from '@/lib/auth';

/** The square it renders at, in the header and so far nowhere else. A second
 * caller that wants another size is what turns this back into a prop. */
const SIZE = 24;

/**
 * A Viewer's picture as their provider serves it, or nothing when they have
 * none. Decorative wherever it appears — the name sits beside it — so the
 * alt text is empty. The header is the only caller now that `/settings` is
 * gone.
 */
const ViewerAvatar = ({ viewer }: { viewer: Viewer }): JSX.Element | null =>
  viewer.image ? (
    <Image
      src={viewer.image}
      alt=''
      width={SIZE}
      height={SIZE}
      className='rounded-full'
    />
  ) : null;

export { ViewerAvatar };
