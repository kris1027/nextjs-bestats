'use client';

import type { JSX } from 'react';

import { ErrorNotice } from '@/components/layout/error-notice';

/**
 * The page for what nobody anticipated. The failures the glossary has a word
 * for never reach it: a TMDB request or a sign-in that went Unanswered is
 * rendered by the page that asked, with the rest of that page intact. What
 * arrives here is a page that could not be built at all — a list whose
 * Viewer could not be checked, the database refusing — so the offer is to
 * try again, since what did not answer may answer next time. One at the
 * root rather than one per route, because no route has anything of its own
 * to say about an unexpected failure.
 *
 * A client component, as Next requires of an error boundary. `retry` fetches
 * the segment from the server again and re-renders it, which is what "may
 * answer next time" needs; `reset` would only redraw what was already
 * fetched, and the failure with it.
 */
const ErrorPage = ({ retry }: { retry: () => void }): JSX.Element => (
  <ErrorNotice retry={retry} />
);

export default ErrorPage;
