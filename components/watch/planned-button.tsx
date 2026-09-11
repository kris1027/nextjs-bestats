'use client';

import type { JSX } from 'react';

import { Bookmark } from 'lucide-react';

import type { MarkingHandle } from '@/components/watch/use-marking';
import { cn, markingButton, markingPressed } from '@/lib/utils';
import { MARKING_FIELD, markingValue, PLANNED } from '@/lib/watch';

/**
 * The Planned button: the whole of a card's control, and the first of the
 * detail page's. One component because the two are the same button down to
 * the class it wears, and a card that reached Planned differently from the
 * detail page would be a difference nobody chose.
 *
 * It takes the whole handle rather than a pressed flag and a handler, for the
 * reason a `ViewerLookup` is one value: the two are only ever right together,
 * and a caller that paired them by hand could pair them wrongly without a
 * type error — a button lit for Planned that presses something else.
 */
const PlannedButton = ({ handle }: { handle: MarkingHandle }): JSX.Element => {
  const planned = handle.shown?.state === 'planned';

  return (
    <button
      type='submit'
      name={MARKING_FIELD}
      value={markingValue(PLANNED)}
      onClick={handle.press(PLANNED)}
      aria-pressed={planned}
      className={cn(
        markingButton,
        'gap-1.5 px-2.5 py-1.5',
        planned && markingPressed,
      )}
    >
      <Bookmark size={14} className={cn(planned && 'fill-current')} />
      Planned
    </button>
  );
};

export { PlannedButton };
