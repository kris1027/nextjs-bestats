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

import { cn, control } from '@/lib/utils';

/**
 * Renders as a real link to `href` — that is the semantic destination, the
 * fallback, and what modifier-clicks and the status bar act on. When the
 * visitor reached this page from inside the app, the click is intercepted and
 * turned into a history step instead, so the scroll position they left is
 * restored.
 *
 * Next exposes no "can I go back?" API. `history.length` is the usable signal:
 * it counts soft navigations, whereas `document.referrer` does not update on
 * them and would misreport in-app navigation as external.
 */
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

  // read in an effect, not during render: the server has no window, and
  // branching on it directly would desync the markup at hydration
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    setHasHistory(window.history.length > 1);
  }, []);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    // leave cmd/ctrl/shift-click and middle-click to open `href` as usual
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
    <Link href={href} onClick={handleClick} className={cn(control, className)}>
      <ArrowLeft size={18} />
      {children}
    </Link>
  );
};

export { BackButton };
