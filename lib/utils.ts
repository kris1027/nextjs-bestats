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

/**
 * A marking control's buttons: the same bordered control at the size a card
 * has room for, with no padding of its own. The Planned button sets its own,
 * a star is a flex cell of a fixed height, and both are drawn in two places —
 * a card's control and the detail page's — which is why the string is here
 * rather than in either of them.
 */
export const markingButton =
  'inline-flex items-center justify-center border border-foreground/40 font-extrabold text-foreground text-xs leading-[1.2] transition-colors hover:bg-foreground/7 active:bg-foreground/14';

/** And what one of them wears once it is what the Watch Record says. */
export const markingPressed =
  'border-primary bg-primary text-primary-foreground hover:bg-primary/85 active:bg-primary/75';
