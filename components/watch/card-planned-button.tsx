'use client';

import type { JSX } from 'react';

import { Bookmark } from 'lucide-react';

import { CardGlyph } from '@/components/media/card-glyph';
import { MarkingForm } from '@/components/watch/marking-form';
import { mediaTarget } from '@/components/watch/marking-target';
import { useMarking } from '@/components/watch/use-marking';
import type { MediaRef } from '@/lib/media';
import {
  MARKING_FIELD,
  type Marking,
  markingValue,
  PLANNED,
} from '@/lib/watch';

/**
 * The bookmark in a card's lower corner, which marks the Media Planned and,
 * pressed again, unmarks it. An outline until it is Planned, filled after —
 * the one mark a card can set. The detail page is still where a Movie is
 * scored and a Show stopped; this is the press a grid is for.
 *
 * `MediaCard` draws it only where the press can land: never on a Watched
 * Movie, whose Score a move to Planned would destroy from a grid with no
 * stars in sight to say so, and never on a Stopped Show or one the card knows
 * is under way, which the action refuses — a Show's Planned lasts until its
 * first Episode. On Trending and search a card does not know whether a Show
 * is under way, so the press goes and the action's refusal is the sentence
 * above the button.
 *
 * Outside the card's link, since a button inside one is nested interactive
 * content, and laid over the poster by `MediaCard`. Keyed on the Viewer by
 * its caller, as every marking control is: its state outlives a re-render.
 * A Visitor's press goes to sign in and back, as the detail page's does.
 */
const CardPlannedButton = ({
  media,
  label,
  marking,
}: {
  media: MediaRef;
  /** The Media's name, so each of twenty bookmarks says which it marks. */
  label: string;
  marking: Marking | null;
}): JSX.Element => {
  const handle = useMarking(marking, mediaTarget(media));
  const planned = handle.shown?.state === 'planned';

  return (
    <MarkingForm
      handle={handle}
      className='pointer-events-auto absolute right-2 bottom-2 sm:right-2.75 sm:bottom-2.75'
      // above the bookmark rather than under it, where the title is; empty,
      // it stays in the tree at no size, as a live region has to
      errorClassName='absolute right-0 bottom-full mb-1.5 min-h-0 w-max max-w-30 rounded-md bg-background/90 px-2 py-1 text-right empty:p-0'
    >
      <button
        type='submit'
        name={MARKING_FIELD}
        value={markingValue(PLANNED)}
        onClick={handle.press(PLANNED)}
        aria-pressed={planned}
        aria-label={`Planned: ${label}`}
        title='Planned'
        className='grid size-7 place-items-center rounded-full border border-white/20 bg-background/72 backdrop-blur-md transition-colors hover:bg-background/92 sm:size-9'
      >
        {planned ? (
          <CardGlyph glyph='planned' className='size-3.5 sm:size-4.25' />
        ) : (
          <Bookmark
            strokeWidth={1.8}
            className='size-3.5 text-foreground sm:size-4.25'
          />
        )}
      </button>
    </MarkingForm>
  );
};

export { CardPlannedButton };
