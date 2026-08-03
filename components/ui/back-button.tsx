'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type JSX,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useState,
} from 'react';

import { ArrowLeft } from 'lucide-react';

import { cn } from '@/lib/utils';

const BackButton = ({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}): JSX.Element => {
  const router = useRouter();
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    setHasHistory(window.history.length > 1);
  }, []);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (!hasHistory) return;

    event.preventDefault();
    router.back();
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-2 border border-foreground/40 px-3.5 py-2 font-extrabold font-heading text-foreground text-sm leading-[1.2] transition-colors hover:bg-foreground/7 active:bg-foreground/14',
        className,
      )}
    >
      <ArrowLeft size={18} />
      {children}
    </Link>
  );
};

export { BackButton };
