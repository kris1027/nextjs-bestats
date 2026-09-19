'use client';

import type { JSX } from 'react';

import { MarkingForm } from '@/components/watch/marking-form';
import { episodeTarget } from '@/components/watch/marking-target';
import { StarRow } from '@/components/watch/star-row';
import { useMarking } from '@/components/watch/use-marking';
import type { EpisodeRef } from '@/lib/media';
import type { EpisodeMarking } from '@/lib/watch';

/**
 * An Episode's control: the ten stars and nothing else, since an Episode is
 * Watched at a Score or has no Watch Record at all, and there is no Planned
 * to press. Giving one is how a Viewer records watching it.
 *
 * Drawn only for an Episode that has aired; the action refuses the rest
 * anyway, so the page leaving the stars out is a courtesy and not the guard.
 */
const EpisodeScoreControl = ({
  episode,
  marking,
}: {
  episode: EpisodeRef;
  marking: EpisodeMarking | null;
}): JSX.Element => {
  const handle = useMarking(marking, episodeTarget(episode));

  return (
    <MarkingForm handle={handle}>
      <StarRow handle={handle} />
    </MarkingForm>
  );
};

export { EpisodeScoreControl };
