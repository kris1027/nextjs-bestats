import type { JSX, ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * A pill laid over a poster: shadcn's `Badge` in dark glass, so it reads over
 * a white poster and a black one alike. The badge's own case, tracking and
 * size are undone here rather than in the generated file, which stays as
 * shadcn wrote it. The caller places it, since each pill has a corner.
 *
 * `score` rims it in the Score's colour, which is what tells the Viewer's own
 * number from TMDB's at a glance.
 */
const OverlayBadge = ({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: 'neutral' | 'score';
  className?: string;
  children: ReactNode;
}): JSX.Element => (
  <Badge
    className={cn(
      'pointer-events-none absolute gap-1 rounded-full border bg-background/80 px-2 py-1 font-semibold text-[11px] text-foreground leading-none normal-case tracking-normal backdrop-blur-md sm:gap-1.5 sm:px-2.5 sm:py-1.25 sm:text-[13px] [&>svg]:size-3! sm:[&>svg]:size-3.5!',
      tone === 'score' ? 'border-score/55' : 'border-white/12',
      className,
    )}
  >
    {children}
  </Badge>
);

export { OverlayBadge };
