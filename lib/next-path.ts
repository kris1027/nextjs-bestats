import { firstValue } from '@/lib/search-params';

/** Where a Visitor is sent when `?next=` names nowhere it is willing to go. */
const HOME = '/';

/**
 * Reads the `?next=` parameter `/sign-in` carries: the address a Visitor
 * returns to once they are a Viewer. Spelled `next` in the address bar, and
 * unrelated to Next itself.
 *
 * It is a destination and never an instruction — nothing is replayed on
 * arrival, so the worst a bad value can do is send someone somewhere. Only a
 * same-origin path is honoured, and anything else becomes `/` rather than
 * being followed, because a parameter that can name another origin turns
 * sign-in into an open redirect.
 *
 * Three spellings of "another origin" have to be refused, and only the first
 * is obvious:
 *
 * - `https://elsewhere.example` — an absolute URL.
 * - `//elsewhere.example` — protocol-relative; a `startsWith('/')` check
 *   passes it and the browser resolves it off-site.
 * - `/\elsewhere.example` — browsers fold the backslash to `/`, making it the
 *   case above wearing a disguise.
 *
 * Leading whitespace and control characters are refused for the same reason:
 * they are stripped before the value is resolved, so they can hide any of the
 * three.
 */
export const nextPath = (value: string | string[] | undefined): string => {
  const path = firstValue(value);

  if (!path.startsWith('/')) return HOME;
  if (path.startsWith('//') || path.startsWith('/\\')) return HOME;

  for (const character of path) {
    if (character.charCodeAt(0) <= 0x20) return HOME;
  }

  return path;
};

/**
 * The address a Visitor is at, as the `?next=` a control on that page should
 * carry: the pathname, and the query string when there is one. The query
 * string matters — a press on `/search?q=dune&kind=movie` has to come back to
 * that list, not to the empty search page. `query` is what
 * `useSearchParams().toString()` gives: no leading `?`, empty when there is
 * none.
 */
export const address = (pathname: string, query: string): string =>
  query ? `${pathname}?${query}` : pathname;
