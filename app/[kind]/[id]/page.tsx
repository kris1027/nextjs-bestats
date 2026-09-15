import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type JSX, Suspense } from 'react';

import { LinkRows } from '@/components/media/link-rows';
import { MediaDetail } from '@/components/media/media-detail';
import { MediaDetailSkeleton } from '@/components/media/media-skeleton';
import { MarkingControlSkeleton } from '@/components/watch/control-skeleton';
import { GoneEpisodeRow } from '@/components/watch/gone-episode-row';
import { MarkingControl } from '@/components/watch/marking-control';
import { answeredViewer } from '@/lib/auth';
import {
  isKind,
  isMediaId,
  type MediaDetails,
  type MediaRef,
  mediaDetails,
  type ShowEpisodes,
  seasonAddress,
  showEpisodes,
  showSeasons,
} from '@/lib/media';
import { goneEpisodes, markingOf } from '@/lib/watch';
import {
  answeredShowEpisodeLookup,
  answeredWatchLookup,
} from '@/lib/watch-queries';

type RouteParams = { kind: string; id: string };

/**
 * Resolves to `null` for any address TMDB cannot answer. Only the page turns
 * that into a 404 — `generateMetadata` falls back instead, so the not-found
 * page still renders on the server rather than only after hydration.
 *
 * The `ref` comes back beside the Media because the marking control needs
 * it, and guarding the segments here once is what makes it a `MediaRef`.
 *
 * Called once by each; Next memoizes identical fetches within a render pass,
 * so that is still one request to TMDB.
 */
const findMedia = async (
  params: Promise<RouteParams>,
): Promise<{ media: MediaDetails; ref: MediaRef } | null> => {
  const { kind, id } = await params;

  // an id that cannot exist is a 404 before a request is made
  if (!isKind(kind) || !isMediaId(id)) return null;

  const ref: MediaRef = { kind, id: Number(id) };
  const media = await mediaDetails(ref.kind, ref.id);

  return media && { media, ref };
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> => {
  const found = await findMedia(params);

  // nothing to say: the root layout's title and description stand
  if (!found) return {};

  return {
    title: found.media.label,
    // an empty overview falls through to the description in the root layout
    description: found.media.overview || undefined,
  };
};

/**
 * The marking control for this Media, behind a boundary of its own: it
 * alone waits on the Viewer and the database, and the Media should not.
 * Nothing when the lookup went Unanswered, the same as a card.
 */
const Control = async ({
  media,
}: {
  media: MediaRef;
}): Promise<JSX.Element | null> => {
  const asked = await answeredViewer();
  const lookup = await answeredWatchLookup(asked, [media]);

  if (lookup.markings === null) return null;

  return (
    <MarkingControl
      key={lookup.viewerKey}
      media={media}
      marking={markingOf(lookup.markings, media)}
    />
  );
};

/**
 * A Show's seasons, each a link to its page. Nothing when TMDB lists none,
 * which a Show that has never aired can do. The Show's page asked for the
 * same path a moment ago, so this is its cache and not a second request.
 */
const Seasons = async ({ id }: { id: number }): Promise<JSX.Element | null> => {
  const seasons = await showSeasons(id);

  if (!seasons || seasons.length === 0) return null;

  return (
    <section className='flex flex-col gap-3 pt-4'>
      <h2 className='font-black text-xl'>Seasons</h2>
      <LinkRows
        label='Seasons'
        rows={seasons.map((season) => ({
          href: seasonAddress(id, season.number),
          label: season.label,
          facts: season.facts,
        }))}
      />
    </section>
  );
};

/**
 * The Viewer's records for Episodes of this Show that TMDB no longer lists,
 * each with its Score and a way to unscore it, since a Gone Episode has no
 * page of its own to do that on. Nothing for a Visitor, for a Viewer with no
 * such records — the common case, which is why the boundary's fallback is
 * nothing — and for an answer Unanswered on either side: a season TMDB did
 * not answer for is not a season without Episodes, and reading it as one
 * would list every record in it as Gone.
 * — `docs/adr/0020-an-episode-record-is-keyed-on-its-tmdb-id.md`
 */
const GoneEpisodes = async ({
  id,
}: {
  id: number;
}): Promise<JSX.Element | null> => {
  const asked = await answeredViewer();
  const lookup = await answeredShowEpisodeLookup(asked, id);

  // TMDB is asked only once there is a record it could have stopped listing
  if (!lookup.markings || lookup.markings.size === 0) return null;

  let show: ShowEpisodes | null;

  try {
    show = await showEpisodes(id, { specials: true });
  } catch (cause) {
    console.error(`TMDB tv/${id} Gone Episodes went Unanswered:`, cause);

    return null;
  }

  // the Show itself is Gone, and the page around this is a 404
  if (!show) return null;

  const gone = goneEpisodes(show.seasons, lookup.markings);

  if (gone.length === 0) return null;

  return (
    <section className='flex flex-col gap-3 pt-4'>
      <h2 className='font-black text-xl'>No longer on TMDB</h2>
      <p className='text-sm opacity-60'>
        TMDB no longer lists these episodes, so only your scores are left.
      </p>
      <ol
        aria-label='Episodes no longer on TMDB'
        className='flex flex-col border-foreground/20 border-t'
      >
        {gone.map((episode) => (
          <GoneEpisodeRow
            // keyed on the Viewer as every marking control is, so a row's
            // state does not outlive a sign-out
            key={`${lookup.viewerKey}/${episode.episodeId}`}
            showId={id}
            episode={episode}
          />
        ))}
      </ol>
    </section>
  );
};

/**
 * The Media, once TMDB has answered. Behind the page's boundary because
 * the address is read at request time; the skeleton holds the frame.
 */
const Found = async ({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<JSX.Element> => {
  const found = await findMedia(params);

  if (!found) notFound();

  const { media, ref } = found;

  return (
    <MediaDetail
      media={media}
      control={
        <Suspense fallback={<MarkingControlSkeleton kind={ref.kind} />}>
          <Control media={ref} />
        </Suspense>
      }
    >
      {ref.kind === 'tv' ? (
        <>
          <Seasons id={ref.id} />
          <Suspense fallback={null}>
            <GoneEpisodes id={ref.id} />
          </Suspense>
        </>
      ) : null}
    </MediaDetail>
  );
};

const MediaPage = ({
  params,
}: {
  params: Promise<RouteParams>;
}): JSX.Element => (
  <Suspense fallback={<MediaDetailSkeleton />}>
    <Found params={params} />
  </Suspense>
);

export default MediaPage;
