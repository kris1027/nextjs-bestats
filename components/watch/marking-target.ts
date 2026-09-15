import type { EpisodeRef, MediaRef } from '@/lib/media';
import {
  type MarkResult,
  mark,
  markFromForm,
  scoreEpisode,
  scoreEpisodeFromForm,
  unscoreEpisode,
  unscoreEpisodeFromForm,
} from '@/lib/watch-actions';

/**
 * What a marking control presses: the action its hydrated buttons call and
 * read a result from, the same action as the form posts it before hydration,
 * and the hidden fields naming what the press is about. One value because the
 * three are only right together — a form posting one action while its
 * buttons call another is not a type error, and neither is a form naming
 * something the action it posts to does not mark.
 */
type MarkingTarget = {
  press: (formData: FormData) => Promise<MarkResult>;
  post: (formData: FormData) => Promise<void>;
  fields: Readonly<Record<string, string>>;
};

/** A piece of Media, marked Planned or Watched at a Score. */
const mediaTarget = ({ kind, id }: MediaRef): MarkingTarget => ({
  press: mark,
  post: markFromForm,
  fields: { kind, id: String(id) },
});

/**
 * An Episode, scored. Named by its position, which is what the action asks
 * TMDB about; the id its record is keyed on comes from that answer.
 * — `docs/adr/0020-an-episode-record-is-keyed-on-its-tmdb-id.md`
 */
const episodeTarget = ({
  showId,
  season,
  episode,
}: EpisodeRef): MarkingTarget => ({
  press: scoreEpisode,
  post: scoreEpisodeFromForm,
  fields: {
    show: String(showId),
    season: String(season),
    episode: String(episode),
  },
});

/**
 * An Episode TMDB no longer lists, unscored. Named by the id its record is
 * keyed on and its Show, since it has no position left for TMDB to find it at.
 * — `docs/adr/0020-an-episode-record-is-keyed-on-its-tmdb-id.md`
 */
const goneEpisodeTarget = ({
  showId,
  episodeId,
}: {
  showId: number;
  episodeId: number;
}): MarkingTarget => ({
  press: unscoreEpisode,
  post: unscoreEpisodeFromForm,
  fields: { show: String(showId), id: String(episodeId) },
});

export { episodeTarget, goneEpisodeTarget, mediaTarget, type MarkingTarget };
