import type { JSX, ReactNode } from 'react';

import {
  DetailFrame,
  DetailHeading,
  DetailOverview,
} from '@/components/media/detail-frame';
import type { MediaDetails } from '@/lib/media';

/**
 * `control` is a slot the page fills with the marking control for its own
 * Kind and id, or leaves empty when the Viewer's Watch Records went
 * Unanswered. A slot rather than a prop of `MediaDetails`, which carries no
 * Kind or id on purpose: this component renders a piece of Media and never
 * learns that Watch Records exist.
 *
 * `children` follows the overview, and is where a Show's page lists its
 * seasons: the page knows the Kind it rendered, and this component does not.
 */
const MediaDetail = ({
  media,
  control,
  children,
}: {
  media: MediaDetails;
  control?: ReactNode;
  children?: ReactNode;
}): JSX.Element => {
  return (
    <DetailFrame
      backdropUrl={media.backdropUrl}
      posterUrl={media.posterUrl}
      back='/'
    >
      <DetailHeading
        label={media.label}
        rating={media.rating}
        voteCount={media.voteCount}
        facts={media.facts}
      />

      {control ? <div className='max-w-xs'>{control}</div> : null}

      <DetailOverview overview={media.overview} />

      {children}
    </DetailFrame>
  );
};

export { MediaDetail };
