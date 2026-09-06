import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type JSX, Suspense } from 'react';

import { MediaDetail } from '@/components/media/media-detail';
import { MediaDetailSkeleton } from '@/components/media/media-skeleton';
import { MarkingControlSkeleton } from '@/components/watch/control-skeleton';
import { MarkingControl } from '@/components/watch/marking-control';
import { answeredViewer } from '@/lib/auth';
import {
  isKind,
  isMediaId,
  type MediaDetails,
  type MediaRef,
  mediaDetails,
} from '@/lib/media';
import { stateOf } from '@/lib/watch';
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
  const lookup = await answeredWatchLookup(await answeredViewer(), [media]);

  if (lookup === null) return null;

  return <MarkingControl media={media} state={stateOf(lookup, media)} />;
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
        <Suspense fallback={<MarkingControlSkeleton />}>
          <Control media={ref} />
        </Suspense>
      }
    />
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
