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

/** TMDB returns an empty string for shows that have not aired yet. */
export const formatAirDate = (date: string): string | null => {
  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime()) ? null : dateFormat.format(parsed);
};
