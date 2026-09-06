import type { JSX } from 'react';

import { MediaPlaceholder } from '@/components/media/media-placeholder';
import { MarkingControl } from '@/components/watch/marking-control';
import { type Absence, KIND_WORDS, type MediaRef } from '@/lib/media';
import type { WatchState } from '@/lib/watch';

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
 */
const AbsentCard = ({
  media,
  answer,
  state,
}: {
  media: MediaRef;
  answer: Absence;
  state: WatchState | null;
}): JSX.Element => (
  <li className='flex flex-col'>
    <MediaPlaceholder artwork='poster' />
    <div className='bg-primary px-2.5 py-1.5 text-primary-foreground'>
      {/* "show 1399", capitalised: KIND_WORDS' one spelling of the word,
          rather than a fourth spelling kept here */}
      <h2 className='truncate font-extrabold text-[13px] capitalize leading-[1.2]'>
        {KIND_WORDS[media.kind].one} {media.id}
      </h2>
    </div>
    <p className='px-2.5 pt-2 text-muted-foreground text-xs'>{LINES[answer]}</p>
    <div className='px-2.5 pt-2.5'>
      <MarkingControl media={media} state={state} />
    </div>
  </li>
);

export { AbsentCard };
