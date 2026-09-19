import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type JSX, Suspense } from 'react';

import { EpisodeDetail } from '@/components/media/episode-detail';
import { EpisodeDetailSkeleton } from '@/components/media/media-skeleton';
import { EpisodeScoreSkeleton } from '@/components/watch/control-skeleton';
import { EpisodeScoreControl } from '@/components/watch/episode-score-control';
import { answeredViewer } from '@/lib/auth';
import {
  type EpisodeDetails,
  type EpisodeRef,
  episodeDetails,
  hasAired,
  isEpisodeNumber,
  isMediaId,
  isSeasonNumber,
} from '@/lib/media';
import { episodeMarkingOf } from '@/lib/watch';
import { answeredEpisodeLookup } from '@/lib/watch-queries';

type RouteParams = {
  kind: string;
  id: string;
  season: string;
  episode: string;
};

/**
 * Resolves to `null` for any address TMDB cannot answer. The address is a
 * position, which is what finds an Episode today and all it is good for:
 * TMDB renumbers, so nothing should keep one.
 */
const findEpisode = async (
  params: Promise<RouteParams>,
): Promise<EpisodeDetails | null> => {
  const { kind, id, season, episode } = await params;

  if (
    kind !== 'tv' ||
    !isMediaId(id) ||
    !isSeasonNumber(season) ||
    !isEpisodeNumber(episode)
  ) {
    return null;
  }

  return episodeDetails({
    showId: Number(id),
    season: Number(season),
    episode: Number(episode),
  });
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> => {
  const episode = await findEpisode(params);

  if (!episode) return {};

  // the still stands where a backdrop would, as it does on the page
  const artwork = episode.stillUrl ?? episode.posterUrl;

  return {
    title: `${episode.label} · ${episode.show.label}`,
    description: episode.overview || undefined,
    ...(artwork && { openGraph: { images: [artwork] } }),
  };
};

/**
 * The star row for this Episode, behind a boundary of its own: it alone waits
 * on the Viewer and the database, and the Episode should not. Nothing when
 * the lookup went Unanswered, the same as the Show's page.
 */
const Control = async ({
  episode,
  id,
}: {
  episode: EpisodeRef;
  id: number;
}): Promise<JSX.Element | null> => {
  const asked = await answeredViewer();
  const lookup = await answeredEpisodeLookup(asked, [id]);

  if (lookup.markings === null) return null;

  return (
    <EpisodeScoreControl
      key={lookup.viewerKey}
      episode={episode}
      marking={episodeMarkingOf(lookup.markings, id)}
    />
  );
};

/** The Episode, once TMDB has answered; behind the page's boundary. */
const Found = async ({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<JSX.Element> => {
  const episode = await findEpisode(params);

  if (!episode) notFound();

  const ref: EpisodeRef = {
    showId: episode.show.id,
    season: episode.season.number,
    episode: episode.number,
  };

  return (
    <EpisodeDetail
      episode={episode}
      control={
        // an Episode that has not aired cannot have been watched, so there
        // is nothing to score yet; its air date is a Fact a line above
        hasAired(episode.airDate, new Date()) ? (
          <Suspense fallback={<EpisodeScoreSkeleton />}>
            <Control episode={ref} id={episode.id} />
          </Suspense>
        ) : (
          // the page's fallback cannot know whether the Episode has aired, so
          // the line holds `EpisodeScoreSkeleton`'s height — the star row, the
          // gap and the live region, 58px — whether it takes one line or the
          // two it wraps to at the 320px floor
          <p className='min-h-14.5 text-sm opacity-60'>
            You can score this episode once it has aired.
          </p>
        )
      }
    />
  );
};

const EpisodePage = ({
  params,
}: {
  params: Promise<RouteParams>;
}): JSX.Element => (
  <Suspense fallback={<EpisodeDetailSkeleton />}>
    <Found params={params} />
  </Suspense>
);

export default EpisodePage;
