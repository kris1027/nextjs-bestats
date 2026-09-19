'use client';

import type { JSX, ReactNode } from 'react';

import { CardHead, type CardHeadContent } from '@/components/watch/card-head';
import { MarkingForm } from '@/components/watch/marking-form';
import { mediaTarget } from '@/components/watch/marking-target';
import { PlannedButton } from '@/components/watch/planned-button';
import { ShowButton } from '@/components/watch/show-button';
import { useMarking } from '@/components/watch/use-marking';
import type { MediaRef } from '@/lib/media';
import { type Marking, scoreOf, showPress } from '@/lib/watch';

/**
 * The body of a card whose Media a Viewer can mark: the head, then the one
 * control a card has room for. `AbsentCard` is its only caller: a
 * `MediaCard` marks only Planned, from its bookmark, and leaves the rest to
 * the detail page it links to, while Gone Media has no detail page, so this
 * card draws the labelled button that page would.
 *
 * One caller and still its own file: inlining it would make `absent-card.tsx`
 * a client component whole, and the placeholder and the line it draws would
 * leave the server with it. Taking the poster as a prop is the same trick —
 * the client subtree spans the markup without owning what fills it.
 *
 * One component rather than a badge and a button apart, because the two have
 * to agree the instant a press lands and can only share the optimistic
 * marking inside one client subtree. The head is inside the link and the
 * button has to be outside it — a button inside a link is nested interactive
 * content — so this spans them both.
 *
 * A card cannot set a Score: ten pressable stars need the detail page's
 * width. Pressing Planned on a scored record moves it and drops the Score,
 * and pressing Planned again unmarks it — which is the only way at all to
 * remove a Watch Record whose Media is Gone.
 *
 * A Show draws the button its own page would: Planned where the Viewer has
 * scored none of its Episodes, and Stop watching where they have, since a
 * Show under way has no record for Planned to remove and a Gone one has no
 * page left to stop it on. A card is never drawn for a finished Show, which
 * is on the Watched list only once TMDB has said so.
 */
const MarkableCard = ({
  media,
  marking,
  underWay,
  head,
  children,
}: {
  media: MediaRef;
  marking: Marking | null;
  /** Whether the Viewer has scored an Episode of this Show; never a Movie. */
  underWay: boolean;
  /** Passed straight on; the Score on top of it is this component's. */
  head: CardHeadContent;
  /** Anything between the title and the control. */
  children?: ReactNode;
}): JSX.Element => {
  const handle = useMarking(marking, mediaTarget(media));
  const { shown } = handle;
  // never `null` here: a card's Show is unstarted or under way, never
  // finished or Unanswered, and either of those picks a button
  const pressed =
    media.kind === 'tv'
      ? showPress(shown, underWay ? 'underWay' : 'unstarted')
      : null;

  return (
    <>
      <CardHead {...head} score={shown && scoreOf(shown)} />
      {children}
      <div className='pt-2.5'>
        <MarkingForm handle={handle}>
          {pressed ? (
            <ShowButton handle={handle} pressed={pressed} />
          ) : (
            <PlannedButton handle={handle} />
          )}
        </MarkingForm>
      </div>
    </>
  );
};

export { MarkableCard };
