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

/**
 * A noun in the two forms counting it needs — "season" and "seasons". Said
 * once here because it travels: the count formatters take it, and a Kind's
 * words carry it.
 *
 * The fields are CLDR's plural-category names, not `singular`/`plural`: they
 * are the categories `Intl.PluralRules` names for this locale, so a language
 * with more of them would gain fields rather than have these two renamed.
 * Leave them spelled this way.
 */
export type NounForms = { one: string; other: string };

/** English has two plural categories, so `count === 1` is the whole rule. */
export const formatCount = (count: number, forms: NounForms): string => {
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

/**
 * Describes a list that may be only part of what was found. Naming both
 * numbers is only honest while there are more; once the list holds everything
 * there is no "top" to qualify and the plain count is the whole truth.
 *
 * Reads as the tail of a sentence — "Showing the top 20 of 1,247 shows",
 * "Showing 6 shows".
 */
export const formatTally = (
  shown: number,
  total: number,
  forms: NounForms,
): string =>
  total > shown
    ? `the top ${numberFormat.format(shown)} of ${formatCount(total, forms)}`
    : formatCount(total, forms);

/**
 * A number on its own, grouped for the locale. For the places a noun is
 * already in view and repeating it would only pad the label — a tab that
 * names its Kind and wears its count.
 */
export const formatNumber = (value: number): string =>
  numberFormat.format(value);
