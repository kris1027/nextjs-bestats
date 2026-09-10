'use client';

import type { JSX } from 'react';

import { Bookmark, Star } from 'lucide-react';

import { MarkingForm } from '@/components/watch/marking-form';
import { useMarking } from '@/components/watch/use-marking';
import type { MediaRef } from '@/lib/media';
import { cn } from '@/lib/utils';
import {
  MARKING_FIELD,
  type Marking,
  markingValue,
  PLANNED,
  SCORES,
  scoreOf,
  watchedAt,
} from '@/lib/watch';

/** What every button in here wears, pressed or not. */
const BUTTON =
  'inline-flex items-center justify-center border border-foreground/40 font-extrabold text-foreground text-xs leading-[1.2] transition-colors hover:bg-foreground/7 active:bg-foreground/14';

/** And what it wears once it is what the Watch Record says. */
const PRESSED =
  'border-primary bg-primary text-primary-foreground hover:bg-primary/85 active:bg-primary/75';

/**
 * The whole marking control: Planned, and the ten stars that are the only way
 * to reach Watched. Pressing what the Watch Record already says unmarks it,
 * pressing a different star rescores it, and pressing Planned on a scored
 * record moves it and drops the Score.
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 *
 * The detail page is its only caller, and that is what makes the row of ten
 * possible: the slot there is 320px at every viewport, where a card in a grid
 * is 136px at the narrowest screen the app answers for. Ten targets in 136px
 * is 13px apiece, so a card gets `MarkableCard` instead, which shows a Score
 * and cannot set one. One caller is also why there is no container query
 * here — nothing about this control's width is in doubt.
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
  const { next, shown, error, press } = useMarking(marking);
  const score = shown && scoreOf(shown);
  const planned = shown?.state === 'planned';

  return (
    <MarkingForm media={media} next={next} error={error}>
      <button
        type='submit'
        name={MARKING_FIELD}
        value={markingValue(PLANNED)}
        onClick={press(PLANNED)}
        aria-pressed={planned}
        className={cn(BUTTON, 'gap-1.5 px-2.5 py-1.5', planned && PRESSED)}
      >
        <Bookmark size={14} className={cn(planned && 'fill-current')} />
        Planned
      </button>
      {/* the ten stars as one labelled group, so a screen reader meets them
          as a scale rather than as ten unrelated buttons. The legend is read
          but not drawn: the stars say what they are, and the detail page has
          TMDB's Rating a few lines up that they must not be mistaken for. */}
      {/* the narrowest the row is ever drawn is a 320px screen, where the
          page's padding leaves 288px for ten stars: a hairline gap and a
          taller button are what keep each one a target a thumb can find. */}
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
              className={cn(BUTTON, 'h-9 flex-1', lit && PRESSED)}
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
