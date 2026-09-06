/** The `searchParams` a page receives: every value may repeat or be absent. */
export type SearchParams = { [key: string]: string | string[] | undefined };

/**
 * A query parameter can repeat — `?q=a&q=b` — so the first one wins. Shared
 * rather than restated: `/search` reads `?q=` and `?kind=` this way, and
 * `lib/next-path` reads `?next=` the same way, so the rule lives once.
 */
export const firstValue = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? '';
