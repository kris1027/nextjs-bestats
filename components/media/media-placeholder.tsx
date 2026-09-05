import type { JSX } from 'react';

import type { Artwork } from '@/lib/media';
import { cn } from '@/lib/utils';

const variants = {
  poster: { shape: 'aspect-2/3', label: 'no poster' },
  backdrop: { shape: 'h-full', label: 'no backdrop' },
} as const;

const MediaPlaceholder = ({ artwork }: { artwork: Artwork }): JSX.Element => {
  const { shape, label } = variants[artwork];

  return (
    <div
      aria-hidden='true'
      className={cn(
        'flex items-center justify-center bg-muted text-muted-foreground text-sm',
        shape,
      )}
    >
      {label}
    </div>
  );
};

export { MediaPlaceholder };
