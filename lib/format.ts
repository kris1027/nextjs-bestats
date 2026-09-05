/**
 * The one place the app's locale is decided — `<html lang>`, plural choice,
 * number and date formatting all read from here.
 */
export const LOCALE = 'en-US';

const numberFormat = new Intl.NumberFormat(LOCALE);

// TMDB air dates are calendar days with no time zone, so `new Date()` parses
// them as UTC midnight. Formatting in UTC keeps visitors west of it from
// seeing the day before.
const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'long',
  timeZone: 'UTC',
});

/** English has two plural categories, so `count === 1` is the whole rule. */
export const formatCount = (
  count: number,
  forms: { one: string; other: string },
): string => {
  const noun = count === 1 ? forms.one : forms.other;

  return `${numberFormat.format(count)} ${noun}`;
};

/** TMDB returns an empty string for a date it does not have. */
export const formatDate = (date: string): string | null => {
  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime()) ? null : dateFormat.format(parsed);
};

/**
 * TMDB gives runtime in whole minutes, and `null` or `0` for movies whose
 * length it does not know. Unlike the counts above this is abbreviated, so a
 * three-hour movie stays a tag rather than a sentence.
 */
export const formatRuntime = (minutes: number | null): string | null => {
  if (!minutes) return null;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (!hours) return `${rest}m`;

  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};
