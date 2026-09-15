'use client';

import type { JSX } from 'react';

import { MarkingForm } from '@/components/watch/marking-form';
import { mediaTarget } from '@/components/watch/marking-target';
import { ShowButton } from '@/components/watch/show-button';
import { useMarking } from '@/components/watch/use-marking';
import type { MediaRef } from '@/lib/media';
import { type Marking, type ShowProgress, showPress } from '@/lib/watch';

/**
 * A Show's own marking control on its detail page: one button, which the
 * Viewer's progress picks, and no stars. A Show is never Watched: a Viewer
 * scores its Episodes, each on its own page.
 * — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
 *
 * Its own component rather than a branch of `MarkingControl`, since the two
 * differ in what they can do: a Movie's is Planned and ten stars whatever the
 * Viewer has watched, and a Show's is one button chosen by it.
 *
 * A finished Show draws nothing, not even the form: there is nothing to press,
 * so there is no refusal for its live region to announce.
 */
const ShowControl = ({
  show,
  marking,
  progress,
}: {
  show: MediaRef<'tv'>;
  marking: Marking | null;
  /** `null` is Unanswered: only a record the Show holds is drawn. */
  progress: ShowProgress | null;
}): JSX.Element | null => {
  const handle = useMarking(marking, mediaTarget(show));
  const pressed = showPress(handle.shown, progress);

  if (!pressed) return null;

  return (
    <MarkingForm handle={handle}>
      <ShowButton handle={handle} pressed={pressed} />
    </MarkingForm>
  );
};

export { ShowControl };
