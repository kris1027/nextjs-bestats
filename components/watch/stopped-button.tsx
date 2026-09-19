'use client';

import type { JSX } from 'react';

import { CircleStop } from 'lucide-react';

import type { MarkingHandle } from '@/components/watch/use-marking';
import { cn, markingButton, markingPressed } from '@/lib/utils';
import { MARKING_FIELD, markingValue, STOPPED } from '@/lib/watch';

/**
 * The Stopped button: Stop watching on a Show the Viewer is under way with,
 * and Stopped, lit, once they have given up on it, which a press takes back.
 * One button and not two, because the two are one press of `STOPPED` — the
 * press that makes the record and the press that deletes it — and a button
 * that became another as it landed would move under the Viewer's thumb.
 *
 * The same size and class as `PlannedButton`, since the two take turns in the
 * one slot a Show's control has, and takes the whole handle for its reason.
 */
const StoppedButton = ({ handle }: { handle: MarkingHandle }): JSX.Element => {
  const stopped = handle.shown?.state === 'stopped';

  return (
    <button
      type='submit'
      name={MARKING_FIELD}
      value={markingValue(STOPPED)}
      onClick={handle.press(STOPPED)}
      aria-pressed={stopped}
      className={cn(
        markingButton,
        'gap-1.5 px-2.5 py-1.5',
        stopped && markingPressed,
      )}
    >
      <CircleStop size={14} aria-hidden='true' />
      {stopped ? 'Stopped' : 'Stop watching'}
    </button>
  );
};

export { StoppedButton };
