import type { JSX } from 'react';

import { MediaPlaceholder } from '@/components/media/media-placeholder';
import { MarkingControl } from '@/components/watch/marking-control';
import { capitalize } from '@/lib/format';
import { type Absence, KIND_WORDS, type MediaRef } from '@/lib/media';
import { stateOf, type ViewerLookup } from '@/lib/watch';

/** What each absence says. Gone is TMDB's answer; Unanswered may change. */
const LINES: Record<Absence, string> = {
  gone: 'No longer on TMDB',
  unanswered: 'TMDB did not answer. Try again in a moment.',
};

/**
 * The card for a Watch Record whose Media TMDB gave no Media Item for. A
 * record stores nothing from TMDB, so all the card can name is the Kind and
 * the id, and it says which absence this is. No link: the detail page would
 * only say the same thing. The marking control stays, because unmarking from
 * here is the only way a Viewer can ever remove a Gone record.
 * — `docs/adr/0006-a-watch-record-stores-no-copy-of-tmdb.md`
 *
 * The card reads its own state and its control's key out of `lookup`, the
 * way a `MediaCard` does: the pair is one value so this card cannot be given
 * one Viewer's state under another's key. Only the lists render it, and a
 * Visitor is sent to sign in before one is drawn, so the key here is always
 * a Viewer's and `states` is never Unanswered — the guard is the same one a
 * card makes, said here for the type rather than for the reader.
 */
const AbsentCard = ({
  media,
  answer,
  lookup,
}: {
  media: MediaRef;
  answer: Absence;
  lookup: ViewerLookup;
}): JSX.Element => (
  <li className='flex flex-col'>
    <MediaPlaceholder artwork='poster' />
    <div className='bg-primary px-2.5 py-1.5 text-primary-foreground'>
      {/* "Show 1399": KIND_WORDS' one spelling of the word, raised in the
          text itself so a screen reader hears what the eye sees */}
      <h2 className='truncate font-extrabold text-[13px] leading-[1.2]'>
        {capitalize(KIND_WORDS[media.kind].one)} {media.id}
      </h2>
    </div>
    <p className='px-2.5 pt-2 text-muted-foreground text-xs'>{LINES[answer]}</p>
    {lookup.states !== null ? (
      <div className='px-2.5 pt-2.5'>
        <MarkingControl
          key={lookup.viewerKey}
          media={media}
          state={stateOf(lookup.states, media)}
        />
      </div>
    ) : null}
  </li>
);

export { AbsentCard };
