import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { JSX } from 'react';

import { MediaDetail } from '@/components/media/media-detail';
import { MarkingControl } from '@/components/watch/marking-control';
import { viewer } from '@/lib/auth';
import {
  isKind,
  isMediaId,
  type MediaDetails,
  mediaDetails,
} from '@/lib/media';
import { type MediaRef, stateOf, toLookup } from '@/lib/watch';
import { answeredWatchLookup } from '@/lib/watch-queries';

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

const MediaPage = async ({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<JSX.Element> => {
  const [found, currentViewer] = await Promise.all([
    findMedia(params),
    viewer(),
  ]);

  if (!found) notFound();

  const { media, ref } = found;

  const lookup = currentViewer
    ? await answeredWatchLookup(currentViewer.id, [ref])
    : toLookup([]);

  return (
    <MediaDetail
      media={media}
      // no control when the lookup went Unanswered, the same as a card
      control={
        lookup !== null ? (
          <MarkingControl media={ref} state={stateOf(lookup, ref)} />
        ) : undefined
      }
    />
  );
};

export default MediaPage;
