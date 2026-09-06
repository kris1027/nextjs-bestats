import type { JSX } from 'react';

// Everything on this page follows the check of who is signed in, so there is
// nothing to put outside a boundary: the whole page is the wait.
const SignInLoading = (): JSX.Element => (
  <main className='flex-1 p-4'>
    <div className='mx-auto flex w-full max-w-sm flex-col gap-6 py-4'>
      {/* <output> is a live region on its own, as the marking control's is */}
      <output aria-busy='true' className='block opacity-60'>
        Loading
      </output>
    </div>
  </main>
);

export default SignInLoading;
