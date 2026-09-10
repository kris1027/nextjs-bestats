'use client';

import type { JSX, ReactNode } from 'react';

import { Bookmark } from 'lucide-react';

import { CardHead } from '@/components/watch/card-head';
import { MarkingForm } from '@/components/watch/marking-form';
import { useMarking } from '@/components/watch/use-marking';
import type { MediaRef } from '@/lib/media';
import { cn } from '@/lib/utils';
import {
  MARKING_FIELD,
  type Marking,
  markingValue,
  PLANNED,
  scoreOf,
} from '@/lib/watch';

/**
 * The body of a card whose Media a Viewer can mark: the head, then the one
 * control a card has room for. Both cards in the app are this — `MediaCard`
 * hands it a poster and a link, `AbsentCard` a placeholder and a line about
 * the absence — and both keep their own `<li>`.
 *
 * One component rather than a badge and a button apart, because the two have
 * to agree the instant a press lands and can only share the optimistic
 * marking inside one client subtree. The title bar is inside the link and the
 * button has to be outside it — a button inside a link is nested interactive
 * content — so this spans them both and takes the poster as a prop, which
 * leaves the `<Image>` itself server-rendered.
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 *
 * A card cannot set a Score: ten pressable stars need the detail page's
 * width, so marking something Watched from here means following the link.
 * Pressing Planned on a scored record moves it and drops the Score, and
 * pressing Planned again unmarks it — which is how a Watch Record is removed
 * from a list, and the only way at all for one whose Media is Gone.
 */
const MarkableCard = ({
  media,
  marking,
  label,
  poster,
  href,
  tmdbRating,
  children,
}: {
  media: MediaRef;
  marking: Marking | null;
  label: string;
  poster: ReactNode;
  href?: string;
  tmdbRating?: { rating: number; voteCount: number };
  /** Anything between the title bar and the control. */
  children?: ReactNode;
}): JSX.Element => {
  const { next, shown, error, press } = useMarking(marking);
  const planned = shown?.state === 'planned';

  return (
    <>
      <CardHead
        label={label}
        poster={poster}
        href={href}
        score={shown && scoreOf(shown)}
        tmdbRating={tmdbRating}
      />
      {children}
      <div className='px-2.5 pt-2.5'>
        <MarkingForm media={media} next={next} error={error}>
          <button
            type='submit'
            name={MARKING_FIELD}
            value={markingValue(PLANNED)}
            onClick={press(PLANNED)}
            aria-pressed={planned}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 border border-foreground/40 px-2.5 py-1.5 font-extrabold text-foreground text-xs leading-[1.2] transition-colors hover:bg-foreground/7 active:bg-foreground/14',
              planned &&
                'border-primary bg-primary text-primary-foreground hover:bg-primary/85 active:bg-primary/75',
            )}
          >
            <Bookmark size={14} className={cn(planned && 'fill-current')} />
            Planned
          </button>
        </MarkingForm>
      </div>
    </>
  );
};

export { MarkableCard };
