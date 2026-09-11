'use client';

import type { JSX } from 'react';

import { Star } from 'lucide-react';

import { MarkingForm } from '@/components/watch/marking-form';
import { PlannedButton } from '@/components/watch/planned-button';
import { useMarking } from '@/components/watch/use-marking';
import type { MediaRef } from '@/lib/media';
import { cn, markingButton, markingPressed } from '@/lib/utils';
import {
  MARKING_FIELD,
  type Marking,
  markingValue,
  SCORES,
  scoreOf,
  watchedAt,
} from '@/lib/watch';

/**
 * The whole marking control: Planned, and the ten stars that are the only way
 * to reach Watched. Pressing what the Watch Record already says unmarks it,
 * pressing a different star rescores it, and pressing Planned on a scored
 * record moves it and drops the Score.
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 *
 * The detail page is its only caller, and that is what makes the row of ten
 * possible: the slot there is `max-w-xs`, so 320px everywhere but the 320px
 * floor, where the page's `px-4` leaves 288px — 27px a star. A card in a grid
 * is 136px at that floor, so a card draws no star row and no control either:
 * it shows the Score and links here to change it. One caller is also why
 * there is no container query here — nothing about this control's width is in
 * doubt.
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
  const handle = useMarking(marking);
  const { next, shown, error, press } = handle;
  const score = shown && scoreOf(shown);

  return (
    <MarkingForm media={media} next={next} error={error}>
      <PlannedButton handle={handle} />
      {/* the ten stars as one labelled group, so a screen reader meets them
          as a scale rather than as ten unrelated buttons. The legend is read
          but not drawn: the stars say what they are, and the detail page has
          TMDB's Rating a few lines up that they must not be mistaken for. */}
      {/* at that 288px narrowest, a hairline gap and a taller button are
          what keep each star a target a thumb can find */}
      <fieldset className='flex gap-0.5'>
        <legend className='sr-only'>Your Score</legend>
        {SCORES.map((value) => {
          // every star up to the Score is filled, the way a scale reads,
          // while only the Score itself is the pressed one
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
    </MarkingForm>
  );
};

export { MarkingControl };
