'use client';

import type { JSX } from 'react';

import { PlannedButton } from '@/components/watch/planned-button';
import { StoppedButton } from '@/components/watch/stopped-button';
import type { MarkingHandle } from '@/components/watch/use-marking';
import { type ShowProgress, showPress } from '@/lib/watch';

/**
 * The one button a Show's own control draws, which `showPress` picks: Planned
 * for a Show not started, Stop watching for one under way, or nothing for one
 * finished. The detail page and `MarkableCard` both draw it, so the two
 * cannot pick differently.
 * — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
 */
const ShowButton = ({
  handle,
  progress,
}: {
  handle: MarkingHandle;
  /** `null` is Unanswered: only a record the Show holds is drawn. */
  progress: ShowProgress | null;
}): JSX.Element | null => {
  const pressed = showPress(handle.shown, progress);

  if (pressed?.state === 'planned') return <PlannedButton handle={handle} />;
  if (pressed?.state === 'stopped') return <StoppedButton handle={handle} />;

  return null;
};

export { ShowButton };
