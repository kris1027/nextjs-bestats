import type { JSX } from 'react';

import type { ImageKind } from '@/lib/tmdb';
import { cn } from '@/lib/utils';

const variants = {
  poster: { shape: 'aspect-2/3', label: 'brak plakatu' },
  backdrop: { shape: 'h-full', label: 'brak tła' },
} as const;

const MediaPlaceholder = ({ kind }: { kind: ImageKind }): JSX.Element => {
  const { shape, label } = variants[kind];

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
