import type { JSX, ReactNode } from 'react';

import { DetailFrame, DetailRating } from '@/components/media/detail-frame';
import { Tag } from '@/components/ui/tag';
import type { MediaDetails } from '@/lib/media';

/**
 * `control` is a slot the page fills with the marking control for its own
 * Kind and id, or leaves empty when the Viewer's Watch Records went
 * Unanswered. A slot rather than a prop of `MediaDetails`, which carries no
 * Kind or id on purpose: this component renders a piece of Media and never
 * learns that Watch Records exist.
 */
const MediaDetail = ({
  media,
  control,
}: {
  media: MediaDetails;
  control?: ReactNode;
}): JSX.Element => {
  return (
    <DetailFrame
      backdropUrl={media.backdropUrl}
      posterUrl={media.posterUrl}
      back='/'
    >
      <h1 className='font-black text-3xl leading-[1.05] lg:text-[40px]'>
        {media.label}
      </h1>

      <div className='flex flex-wrap items-center gap-6'>
        <DetailRating rating={media.rating} voteCount={media.voteCount} />
        {/* facts arrive formatted and unique, so each is its own key */}
        {media.facts.map((fact) => (
          <Tag key={fact}>{fact}</Tag>
        ))}
      </div>

      {control ? <div className='max-w-xs'>{control}</div> : null}

      <div className='my-2 h-0.5 bg-foreground/40' />

      {media.overview ? (
        <p className='max-w-[62ch] text-base leading-relaxed'>
          {media.overview}
        </p>
      ) : null}
    </DetailFrame>
  );
};

export { MediaDetail };
