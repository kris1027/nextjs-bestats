'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { JSX } from 'react';

import { address } from '@/lib/next-path';

/**
 * The header's way in for a Visitor, carrying `?next=` so they come back to
 * the page they were reading. A client component only because a server
 * component cannot read its own address; it renders the same link either way.
 */
const SignInLink = ({ className }: { className?: string }): JSX.Element => {
  const pathname = usePathname();
  const search = useSearchParams();
  const next = address(pathname, search.toString());

  return (
    <Link
      href={`/sign-in?next=${encodeURIComponent(next)}`}
      className={className}
    >
      Sign in
    </Link>
  );
};

export { SignInLink };
