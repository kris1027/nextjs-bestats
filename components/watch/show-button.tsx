'use client';

import type { JSX } from 'react';

import { PlannedButton } from '@/components/watch/planned-button';
import { StoppedButton } from '@/components/watch/stopped-button';
import type { MarkingHandle } from '@/components/watch/use-marking';
import type { Marking } from '@/lib/watch';

/**
 * The one button a Show's own control draws, for the marking `showPress`
 * picked: Planned for a Show not started, Stop watching for one under way.
 * The caller asks `showPress` once and draws nothing when it picks nothing,
 * so a finished Show never reaches here. The detail page and `MarkableCard`
 * both draw it, so the two cannot draw a pick differently.
 */
const ShowButton = ({
  handle,
  pressed,
}: {
  handle: MarkingHandle;
  /** What `showPress` picked for what `handle` shows. */
  pressed: Marking;
}): JSX.Element =>
  pressed.state === 'stopped' ? (
    <StoppedButton handle={handle} />
  ) : (
    <PlannedButton handle={handle} />
  );

export { ShowButton };
