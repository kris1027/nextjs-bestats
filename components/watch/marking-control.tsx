'use client';

import type { JSX } from 'react';

import { MarkingForm } from '@/components/watch/marking-form';
import { mediaTarget } from '@/components/watch/marking-target';
import { PlannedButton } from '@/components/watch/planned-button';
import { StarRow } from '@/components/watch/star-row';
import { useMarking } from '@/components/watch/use-marking';
import type { MediaRef } from '@/lib/media';
import { type Marking, takesScore } from '@/lib/watch';

/**
 * The whole marking control for a piece of Media: Planned, and for a Movie the
 * ten stars that are the only way to reach Watched. Pressing Planned on a
 * scored record moves it and drops the Score.
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 *
 * A Show draws Planned alone. It is never Watched: a Viewer scores its
 * Episodes, each on its own page, and the Show is finished once it has ended
 * and TMDB lists no Episode after the furthest they have scored.
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
  media,
  marking,
}: {
  media: MediaRef;
  marking: Marking | null;
}): JSX.Element => {
  const handle = useMarking(marking, mediaTarget(media));

  return (
    <MarkingForm handle={handle}>
      <PlannedButton handle={handle} />
      {takesScore(media.kind) ? <StarRow handle={handle} /> : null}
    </MarkingForm>
  );
};

export { MarkingControl };
