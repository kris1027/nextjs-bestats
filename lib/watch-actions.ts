'use server';

import { redirect } from 'next/navigation';

import { answeredViewer } from '@/lib/auth';
import {
  type EpisodeRef,
  episodeDetails,
  hasAired,
  isEpisodeNumber,
  isKind,
  isMediaId,
  isSeasonNumber,
  type MediaRef,
} from '@/lib/media';
import { nextPath, signInAddress } from '@/lib/next-path';
import {
  type EpisodeMarking,
  episodeMarkingOf,
  isEpisodeMarking,
  MARKING_FIELD,
  MARKS_PER_MINUTE,
  type Marking,
  marked,
  markingFrom,
  markingOf,
  takesScore,
  watchKey,
} from '@/lib/watch';
import {
  clearEpisodeRecord,
  clearWatchRecord,
  episodeLookup,
  tallyMarking,
  watchLookup,
  writeEpisodeRecord,
  writePlannedShow,
  writeWatchRecord,
} from '@/lib/watch-queries';

/**
 * The Viewer a press belongs to, read from the session and from nowhere else:
 * a signed-out Visitor is sent to sign in and back to where they pressed, and
 * a sign-in that went Unanswered is a sentence under the buttons rather than
 * a trip to the sign-in page for someone who may well be signed in. Both
 * actions ask first, so this is said once.
 */
const pressingViewer = async (
  formData: FormData,
): Promise<{ id: string } | { error: string }> => {
  const asked = await answeredViewer();

  if (asked.answer === 'unanswered') {
    return { error: 'Could not check your sign-in. Try again in a moment.' };
  }

  if (asked.answer === 'visitor') {
    // the destination only: nothing is replayed once they are back
    const destination = nextPath(String(formData.get('next') ?? ''));

    redirect(signInAddress(destination));
  }

  return asked.viewer;
};

/**
 * What `mark` hands back to the control. On success, what the Watch Record
 * says now — `null` once unmarked, and a Score with it where it is Watched.
 * On a failed write, a sentence for the Visitor; the cause goes to the server
 * log, because nothing on the client can act on it.
 */
export type MarkResult = { marking: Marking | null } | { error: string };

/**
 * Marks a piece of Media for the Viewer this request belongs to.
 *
 * The form carries what the Visitor did — the Kind, the id, and the marking
 * the button they pressed says — and never what should happen. `marked`
 * decides that here, against the row as it really is, so a page that fell
 * behind another tab cannot carry a delete instruction in a hidden field.
 *
 * In this order on purpose: the Viewer first, so a signed-out Visitor with a
 * tampered form is sent to sign in rather than shown a stack trace — and a
 * sign-in that went Unanswered is a sentence under the buttons, not a trip
 * to the sign-in page for someone who may well be signed in; then the
 * input, which throws rather than returns because our own form cannot
 * produce it; then the press is counted, so a refused press costs one
 * statement and no read or write. Only the count and the write itself are
 * outcomes the Visitor is told about.
 *
 * The Viewer's id comes from the session and from nowhere else. The form does
 * not carry one, and this action would not read it if it did.
 * — `docs/adr/0005-the-viewer-lives-beside-the-domain.md`
 */
export const mark = async (formData: FormData): Promise<MarkResult> => {
  const asked = await pressingViewer(formData);

  if ('error' in asked) return asked;

  const currentViewer = asked;

  const kind = String(formData.get('kind') ?? '');
  const id = String(formData.get('id') ?? '');
  const field = String(formData.get(MARKING_FIELD) ?? '');
  const pressed = markingFrom(field);

  if (!isKind(kind)) throw new Error(`Unknown Kind: ${kind}`);
  if (!isMediaId(id)) throw new Error(`Not a TMDB id: ${id}`);
  if (!pressed) throw new Error(`Not a marking: ${field}`);
  // a Show is followed through its Episodes, and its page draws no stars
  // — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
  if (pressed.state === 'watched' && !takesScore(kind)) {
    throw new Error(`A Show is never Watched: ${field}`);
  }

  const ref: MediaRef = { kind, id: Number(id) };

  try {
    if ((await tallyMarking(currentViewer.id)) > MARKS_PER_MINUTE) {
      return { error: 'Slow down. Try again in a minute.' };
    }

    const lookup = await watchLookup(currentViewer.id, [ref]);
    const marking = marked(markingOf(lookup, ref), pressed);

    // Planned lasts until the first Episode, so a page drawn before one was
    // scored cannot put it back
    // — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
    if (marking?.state === 'planned' && ref.kind === 'tv') {
      if (!(await writePlannedShow(currentViewer.id, ref.id))) {
        return { error: 'You are already watching this show.' };
      }
    } else if (marking) {
      await writeWatchRecord(currentViewer.id, ref, marking);
    } else {
      await clearWatchRecord(currentViewer.id, ref);
    }

    return { marking };
  } catch (cause) {
    console.error(`Marking ${watchKey(ref)} failed:`, cause);

    return { error: 'Could not mark that. Try again in a moment.' };
  }
};

/**
 * `mark` for the form itself, before hydration: the browser posts, the page
 * re-renders with the row as it now is, and there is nobody to hand a result
 * to — which is also why React types a form's `action` as returning nothing.
 * Once hydrated, the buttons' own handler calls `mark` and reads the result.
 */
export const markFromForm = async (formData: FormData): Promise<void> => {
  await mark(formData);
};

/**
 * What `scoreEpisode` hands back: `MarkResult` narrowed to what an Episode's
 * record can say, which is a Score or nothing.
 */
export type ScoreResult =
  | { marking: EpisodeMarking | null }
  | { error: string };

/**
 * Scores an Episode for the Viewer this request belongs to, which is how they
 * record watching it — or unscores it, when the Score pressed is the one it
 * already holds.
 * — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
 *
 * The form names the Episode by its position, the way its page's address
 * does, and not by the id its record is keyed on: TMDB is asked for the
 * Episode at that position, and the id, the Show and whether it has aired all
 * come from that answer rather than from a hidden field. So a form cannot
 * score an Episode under the wrong Show, and an Episode that has not aired is
 * refused here and not only by the page leaving its stars out.
 *
 * The order is `mark`'s: the Viewer, then the input, which throws because our
 * own form cannot produce it, then the press is counted before anything
 * costs a request.
 */
export const scoreEpisode = async (
  formData: FormData,
): Promise<ScoreResult> => {
  const asked = await pressingViewer(formData);

  if ('error' in asked) return asked;

  const show = String(formData.get('show') ?? '');
  const season = String(formData.get('season') ?? '');
  const number = String(formData.get('episode') ?? '');
  const field = String(formData.get(MARKING_FIELD) ?? '');
  const pressed = markingFrom(field);

  if (!isMediaId(show)) throw new Error(`Not a TMDB id: ${show}`);
  if (!isSeasonNumber(season)) throw new Error(`Not a season: ${season}`);
  if (!isEpisodeNumber(number)) throw new Error(`Not an Episode: ${number}`);
  // Planned is a marking, but not one an Episode can hold, and no button on
  // an Episode's page posts it
  if (!pressed || !isEpisodeMarking(pressed)) {
    throw new Error(`Not a Score: ${field}`);
  }

  const ref: EpisodeRef = {
    showId: Number(show),
    season: Number(season),
    episode: Number(number),
  };
  const where = `tv/${show} S${season}E${number}`;

  try {
    if ((await tallyMarking(asked.id)) > MARKS_PER_MINUTE) {
      return { error: 'Slow down. Try again in a minute.' };
    }

    const episode = await episodeDetails(ref);

    if (!episode) {
      return { error: 'TMDB no longer lists that episode.' };
    }

    if (!hasAired(episode.airDate, new Date())) {
      return { error: 'That episode has not aired yet.' };
    }

    const lookup = await episodeLookup(asked.id, [episode.id]);
    const marking = marked(episodeMarkingOf(lookup, episode.id), pressed);

    // `marked` hands back what was pressed or nothing, and what was pressed
    // is a Score, so this narrowing only restates what it already is
    if (marking && isEpisodeMarking(marking)) {
      await writeEpisodeRecord(
        asked.id,
        { episodeId: episode.id, showId: episode.show.id },
        marking,
      );

      return { marking };
    }

    await clearEpisodeRecord(asked.id, episode.id);

    return { marking: null };
  } catch (cause) {
    console.error(`Scoring ${where} failed:`, cause);

    return { error: 'Could not score that. Try again in a moment.' };
  }
};

/** `scoreEpisode` for the form before hydration, as `markFromForm` is. */
export const scoreEpisodeFromForm = async (
  formData: FormData,
): Promise<void> => {
  await scoreEpisode(formData);
};
