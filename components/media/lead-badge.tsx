import type { JSX } from 'react';

import { CardGlyph, type Glyph } from '@/components/media/card-glyph';
import { OverlayBadge } from '@/components/media/overlay-badge';

/**
 * What a lead pill says, what a screen reader hears it called, and its icon.
 */
type LeadContent = {
  label: string;
  text: string;
  glyph: Extract<Glyph, 'episode' | 'date'>;
};

/**
 * A list card's lead — **S2E3**, **Feb 3**, **S2 · No date yet** — over its
 * poster's lower corner. The corner beside it is kept clear at every width,
 * whether or not a bookmark is drawn there, so the pill is one layout rather
 * than two.
 *
 * It wraps rather than cutting its words short. At the 320px floor a card is
 * 136px and the pill has under 90 of them, which "S3E1 · Mar 12" does not fit
 * on one line; clipping it would hide the very day the card is there to say.
 * A date arrives with its month held to its day, so the line breaks at the
 * dot or before the year and never between "Sep" and "17", and the pill grows
 * up over the poster rather than changing the card's height.
 */
const LeadBadge = ({ lead }: { lead: LeadContent }): JSX.Element => (
  <OverlayBadge className='bottom-2 left-2 max-w-[calc(100%-3.125rem)] whitespace-normal text-left sm:bottom-2.75 sm:left-2.75 sm:max-w-[calc(100%-4.3125rem)]'>
    <CardGlyph glyph={lead.glyph} className='shrink-0' />
    <span className='sr-only'>{lead.label}: </span>
    <span className='min-w-0 leading-tight'>{lead.text}</span>
  </OverlayBadge>
);

export { LeadBadge, type LeadContent };
