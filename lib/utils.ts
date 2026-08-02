import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const plRules = new Intl.PluralRules('pl');
const plNumber = new Intl.NumberFormat('pl-PL');
const plDate = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long' });

/** Polish needs three forms: 1 sezon, 2 sezony, 5 sezonów. */
export const formatCount = (
  count: number,
  forms: { one: string; few: string; many: string },
): string => {
  const rule = plRules.select(count);
  const noun =
    rule === 'one' ? forms.one : rule === 'few' ? forms.few : forms.many;

  return `${plNumber.format(count)} ${noun}`;
};

/** TMDB returns an empty string for shows that have not aired yet. */
export const formatAirDate = (date: string): string | null => {
  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime()) ? null : plDate.format(parsed);
};
