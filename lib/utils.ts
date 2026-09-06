import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * The app's one bordered control: what a button and a link-as-button share.
 * `components/ui/` is shadcn's and holds no button of ours, so the string
 * lives here, and a caller adds its own width or alignment through `cn`.
 */
export const control =
  'inline-flex items-center gap-2 border border-foreground/40 px-3.5 py-2 font-extrabold text-foreground text-sm leading-[1.2] transition-colors hover:bg-foreground/7 active:bg-foreground/14';
