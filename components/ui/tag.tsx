import type { JSX, ReactNode } from 'react';

const Tag = ({ children }: { children: ReactNode }): JSX.Element => (
  <span className='inline-flex items-center border border-primary-accent px-2.5 py-0.75 text-[11px] text-primary-accent tracking-wide'>
    {children}
  </span>
);

export { Tag };
