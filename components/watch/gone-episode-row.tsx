'use client';

import type { JSX } from 'react';

import { Star } from 'lucide-react';

import { MarkingForm } from '@/components/watch/marking-form';
import { goneEpisodeTarget } from '@/components/watch/marking-target';
import { useMarking } from '@/components/watch/use-marking';
import { cn, markingButton, markingPressed } from '@/lib/utils';
import { type GoneEpisode, MARKING_FIELD, markingValue } from '@/lib/watch';

/**
 * One Episode TMDB no longer lists, as its Show's page draws it: the Score the
 * Viewer gave it, and that Score as the one button, which unscores it the way
 * pressing a Score on an Episode's page does. There is no title to show,
 * since a record stores nothing from TMDB, so the row says what the Viewer
 * gave it and nothing about which Episode it was.
 *
 * Once unscored there is nothing left to press: a Score is given on an
 * Episode's page, and this one has none, so the row says so instead of
 * drawing a button that could only be refused.
 */
const GoneEpisodeRow = ({
  showId,
  episode,
}: {
  showId: number;
  episode: GoneEpisode;
}): JSX.Element => {
  const handle = useMarking(
    episode.marking,
    goneEpisodeTarget({ showId, episodeId: episode.episodeId }),
  );
  const { shown } = handle;
  const scored = shown?.state === 'watched' ? shown : null;

  return (
    <li className='border-foreground/20 border-b pt-3 pb-1.5'>
      <MarkingForm handle={handle}>
        <div className='flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2'>
          <span className='font-extrabold'>
            {scored ? 'An episode you scored' : 'No longer scored'}
          </span>
          {scored ? (
            <button
              type='submit'
              name={MARKING_FIELD}
              value={markingValue(scored)}
              onClick={handle.press(scored)}
              aria-pressed={true}
              aria-label={`Score ${scored.score} out of 10`}
              className={cn(markingButton, 'h-9 gap-1.5 px-3', markingPressed)}
            >
              <Star size={14} className='fill-current' aria-hidden='true' />
              {scored.score}
            </button>
          ) : null}
        </div>
      </MarkingForm>
    </li>
  );
};

export { GoneEpisodeRow };
