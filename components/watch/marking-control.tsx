'use client';

import type { JSX } from 'react';

import { MarkingForm } from '@/components/watch/marking-form';
import { mediaTarget } from '@/components/watch/marking-target';
import { PlannedButton } from '@/components/watch/planned-button';
import { StarRow } from '@/components/watch/star-row';
import { useMarking } from '@/components/watch/use-marking';
import type { MediaRef } from '@/lib/media';
import type { Marking } from '@/lib/watch';

/**
 * The whole marking control for a Movie: Planned, and the ten stars that are
 * the only way to reach Watched. Pressing Planned on a scored record moves it
 * and drops the Score.
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 *
 * A Show draws `ShowControl` instead: it is never Watched, and its one button
 * is chosen by how far the Viewer has got through its Episodes.
 * — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
 *
 * The detail page is its only caller, which is what makes the star row
 * possible, and one caller is also why there is no container query here —
 * nothing about this control's width is in doubt.
 *
 * Rendered for every Visitor, signed in or not: a signed-out press leaves
 * through `/sign-in?next=` and comes back to this page, where they press
 * again. Nothing is replayed for them, and the control does not know which
 * it is rendering for — the flip before the redirect is the price of one
 * rendering path.
 */
const MarkingControl = ({
  movie,
  marking,
}: {
  movie: MediaRef<'movie'>;
  marking: Marking | null;
}): JSX.Element => {
  const handle = useMarking(marking, mediaTarget(movie));

  return (
    <MarkingForm handle={handle}>
      <PlannedButton handle={handle} />
      <StarRow handle={handle} />
    </MarkingForm>
  );
};

export { MarkingControl };
