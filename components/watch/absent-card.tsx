import type { JSX } from 'react';

import { MediaPlaceholder } from '@/components/media/media-placeholder';
import { CardHead } from '@/components/watch/card-head';
import { MarkableCard } from '@/components/watch/markable-card';
import { capitalize } from '@/lib/format';
import { type Absence, KIND_WORDS, type MediaRef } from '@/lib/media';
import { markingOf, type ViewerLookup } from '@/lib/watch';

/** What each absence says. Gone is TMDB's answer; Unanswered may change. */
const LINES: Record<Absence, string> = {
  gone: 'No longer on TMDB',
  unanswered: 'TMDB did not answer. Try again in a moment.',
};

/**
 * The card for a Watch Record whose Media TMDB gave no Media Item for. A
 * record stores nothing from TMDB, so all the card can name is the Kind and
 * the id, and it says which absence this is. No link: the detail page would
 * only say the same thing, and for Gone Media it answers `notFound()`.
 * — `docs/adr/0006-a-watch-record-stores-no-copy-of-tmdb.md`
 *
 * The control stays, because it is the only one a Gone record will ever have.
 * A card cannot score, so a Gone record that is Watched is removed the way
 * any card's is: Planned, which drops the Score, then Planned again, which
 * deletes the row. Nothing else can reach it.
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 *
 * The card reads its own marking and its key out of `lookup`, the way a
 * `MediaCard` does: the pair is one value so this card cannot be given one
 * Viewer's markings under another's key. Only the lists render it, and a
 * Visitor is sent to sign in before one is drawn, so the key here is always a
 * Viewer's and `markings` is never Unanswered — the guard is the same one a
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
}): JSX.Element => {
  // "Show 1399": KIND_WORDS' one spelling of the word, raised in the text
  // itself so a screen reader hears what the eye sees
  const label = `${capitalize(KIND_WORDS[media.kind].one)} ${media.id}`;
  const poster = <MediaPlaceholder artwork='poster' />;
  const line = (
    <p className='px-2.5 pt-2 text-muted-foreground text-xs'>{LINES[answer]}</p>
  );

  return (
    <li className='flex flex-col'>
      {lookup.markings !== null ? (
        <MarkableCard
          key={lookup.viewerKey}
          media={media}
          marking={markingOf(lookup.markings, media)}
          label={label}
          poster={poster}
        >
          {line}
        </MarkableCard>
      ) : (
        <>
          <CardHead label={label} poster={poster} score={null} />
          {line}
        </>
      )}
    </li>
  );
};

export { AbsentCard };
