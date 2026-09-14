'use client';

import type { JSX } from 'react';

import { Star } from 'lucide-react';

import type { MarkingHandle } from '@/components/watch/use-marking';
import { cn, markingButton, markingPressed } from '@/lib/utils';
import {
  MARKING_FIELD,
  markingValue,
  SCORES,
  scoreOf,
  watchedAt,
} from '@/lib/watch';

/**
 * The ten stars that are the only way to give a Score. Pressing the Score the
 * record already holds unmarks it; pressing a different one rescores it.
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 *
 * Only a detail page draws it, because that is the only place ten stars are
 * still ten targets: the slot there is `max-w-xs`, so 320px everywhere but
 * the 320px floor, where the page's `px-4` leaves 288px — 27px a star. A card
 * in a grid is 136px at that floor, so a card draws no star row: it shows the
 * Score and links to the page that changes it.
 *
 * It takes the whole handle for the reason `PlannedButton` does.
 */
const StarRow = ({ handle }: { handle: MarkingHandle }): JSX.Element => {
  const { shown, press } = handle;
  const score = shown && scoreOf(shown);

  return (
    // the ten stars as one labelled group, so a screen reader meets them as a
    // scale rather than as ten unrelated buttons. The legend is read but not
    // drawn: the stars say what they are, and a detail page has TMDB's Rating
    // a few lines up that they must not be mistaken for. At that 288px
    // narrowest, a hairline gap and a taller button are what keep each star a
    // target a thumb can find
    <fieldset className='flex gap-0.5'>
      <legend className='sr-only'>Your Score</legend>
      {SCORES.map((value) => {
        // every star up to the Score is filled, the way a scale reads, while
        // only the Score itself is the pressed one
        const lit = score !== null && value <= score;

        return (
          <button
            key={value}
            type='submit'
            name={MARKING_FIELD}
            value={markingValue(watchedAt(value))}
            onClick={press(watchedAt(value))}
            aria-pressed={score === value}
            aria-label={`Score ${value} out of 10`}
            className={cn(markingButton, 'h-9 flex-1', lit && markingPressed)}
          >
            <Star size={14} className={cn(lit && 'fill-current')} />
          </button>
        );
      })}
    </fieldset>
  );
};

export { StarRow };
