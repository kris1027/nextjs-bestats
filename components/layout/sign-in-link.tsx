'use client';

import Link from 'next/link';
import type { JSX } from 'react';

import { signInAddress } from '@/lib/next-path';
import { useAddress } from '@/lib/use-address';

/**
 * The header's way in for a Visitor, carrying `?next=` so they come back to
 * the page they were reading. A client component only because a server
 * component cannot read its own address; it renders the same link either way.
 */
const SignInLink = ({ className }: { className?: string }): JSX.Element => {
  const next = useAddress();

  return (
    <Link href={signInAddress(next)} className={className}>
      Sign in
    </Link>
  );
};

export { SignInLink };
