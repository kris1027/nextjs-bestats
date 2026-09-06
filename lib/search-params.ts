/** The `searchParams` a page receives: every value may repeat or be absent. */
export type SearchParams = { [key: string]: string | string[] | undefined };

/**
 * A query parameter can repeat — `?q=a&q=b` — so the first one wins. Shared
 * rather than restated: `/search` reads `?q=` and `?kind=` this way, and
 * `lib/next-path` reads `?next=` the same way, so the rule lives once.
 */
export const firstValue = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? '';

// a page counts from 1 and is written the way a person writes a number
const PAGE_PATTERN = /^[1-9]\d*$/;

/**
 * Reads `?page=`: the page a list is open to, counting from 1 the way the
 * address bar does. Anything that is not a whole number from 1 up — absent,
 * `0`, `-1`, `abc` — is page 1, not a 404: `?page=abc` is a typo rather than
 * an address, the way `?kind=abc` on search falls through to the default. A
 * page past the end is a different matter and the page's own to refuse,
 * because only it knows how many pages there are.
 */
export const pageNumber = (value: string | string[] | undefined): number => {
  const page = firstValue(value);

  return PAGE_PATTERN.test(page) ? Number(page) : 1;
};
