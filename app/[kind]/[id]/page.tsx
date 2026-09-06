import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { JSX } from 'react';

import { MediaDetail } from '@/components/media/media-detail';
import {
  isKind,
  isMediaId,
  type MediaDetails,
  mediaDetails,
} from '@/lib/media';

type RouteParams = { kind: string; id: string };

/**
 * Resolves to `null` for any address TMDB cannot answer. Only the page turns
 * that into a 404 — `generateMetadata` falls back instead, so the not-found
 * page still renders on the server rather than only after hydration.
 *
 * Called once by each; Next memoizes identical fetches within a render pass,
 * so that is still one request to TMDB.
 */
const findMedia = async (
  params: Promise<RouteParams>,
): Promise<MediaDetails | null> => {
  const { kind, id } = await params;

  // an id that cannot exist is a 404 before a request is made
  if (!isKind(kind) || !isMediaId(id)) return null;

  return mediaDetails(kind, Number(id));
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> => {
  const media = await findMedia(params);

  // nothing to say: the root layout's title and description stand
  if (!media) return {};

  return {
    title: media.label,
    // an empty overview falls through to the description in the root layout
    description: media.overview || undefined,
  };
};

const MediaPage = async ({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<JSX.Element> => {
  const media = await findMedia(params);

  if (!media) notFound();

  return <MediaDetail media={media} />;
};

export default MediaPage;
