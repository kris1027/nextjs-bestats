import Form from 'next/form';
import type { JSX } from 'react';

import { Search } from 'lucide-react';

/**
 * A GET form, so every search becomes an address of its own and the results
 * stay server-rendered. `next/form` renders a real `<form>` — the browser's
 * own submission still works with no JavaScript — but intercepts it into a
 * client-side navigation, so submitting does not reload the document the way
 * a native GET would, and prefetches `/search` once the form is on screen.
 *
 * It submits `q` alone; which Kind's tab opens is the page's decision.
 */
const SearchForm = ({ query }: { query?: string }): JSX.Element => {
  return (
    <search className='w-full'>
      <Form action='/search' className='flex items-stretch gap-2'>
        <label htmlFor='search-query' className='sr-only'>
          Search shows and movies
        </label>
        <input
          id='search-query'
          name='q'
          type='search'
          defaultValue={query}
          placeholder='Search shows and movies'
          autoComplete='off'
          className='min-w-0 flex-1 border border-foreground/40 bg-transparent px-3.5 py-2 text-sm leading-[1.2] placeholder:text-foreground/40 focus-visible:border-ring focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring'
        />
        <button
          type='submit'
          className='inline-flex shrink-0 items-center gap-2 border border-foreground/40 px-3.5 py-2 font-extrabold text-foreground text-sm leading-[1.2] transition-colors hover:bg-foreground/7 active:bg-foreground/14'
        >
          <Search size={18} />
          Search
        </button>
      </Form>
    </search>
  );
};

export { SearchForm };
