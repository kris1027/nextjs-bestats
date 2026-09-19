import type { JSX } from 'react';

import { CardGlyph } from '@/components/media/card-glyph';
import { Badge } from '@/components/ui/badge';

/**
 * The bookmark in a card's other lower corner, which says the Viewer's record
 * is Planned. It says so and does nothing else: marking is the detail page's
 * alone, and the card this sits on is the link there. So it is a badge and not
 * a button, drawn only once there is a Planned record — an empty outline for
 * "not planned" would look like something to press. The lead pill beside it
 * keeps clear of this corner at every width.
 *
 * Inside the card's link, so a screen reader hears "Planned" as part of it.
 */
const PlannedMark = (): JSX.Element => (
  <Badge className='pointer-events-none absolute right-2 bottom-2 size-7 rounded-full border border-white/20 bg-background/72 p-0 backdrop-blur-md sm:right-2.75 sm:bottom-2.75 sm:size-9 [&>svg]:size-3.5! sm:[&>svg]:size-4.25!'>
    <CardGlyph glyph='planned' />
    <span className='sr-only'>Planned</span>
  </Badge>
);

export { PlannedMark };
