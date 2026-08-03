import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const enRules = new Intl.PluralRules('en');
const enNumber = new Intl.NumberFormat('en-US');
const enDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' });

export const formatCount = (
  count: number,
  forms: { one: string; other: string },
): string => {
  const noun = enRules.select(count) === 'one' ? forms.one : forms.other;

  return `${enNumber.format(count)} ${noun}`;
};

export const formatAirDate = (date: string): string | null => {
  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime()) ? null : enDate.format(parsed);
};
