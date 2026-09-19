import { Montserrat } from 'next/font/google';

/**
 * The app's one typeface, loaded once. `app/layout.tsx` and
 * `app/global-error.tsx` both draw a document and both need it, and each call
 * to a font loader is a stylesheet of its own that Next preloads on every
 * page — so a second call in the error page meant every page fetched a font
 * it never used.
 */
export const sans = Montserrat({ subsets: ['latin'], variable: '--font-sans' });
