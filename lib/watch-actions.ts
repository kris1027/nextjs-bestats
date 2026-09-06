'use server';

import { redirect } from 'next/navigation';

import { viewer } from '@/lib/auth';
import { isKind, isMediaId, type MediaRef } from '@/lib/media';
import { nextPath } from '@/lib/next-path';
import {
  isWatchState,
  marked,
  stateOf,
  type WatchState,
  watchKey,
} from '@/lib/watch';
import {
  clearWatchRecord,
  watchLookup,
  writeWatchRecord,
} from '@/lib/watch-queries';

/**
 * What `mark` hands back to the control. On success, the state the Watch
 * Record is in now — `null` once unmarked. On a failed write, a sentence for
 * the Visitor; the cause goes to the server log, because nothing on the
 * client can act on it.
 */
export type MarkResult = { state: WatchState | null } | { error: string };

/**
 * Marks a piece of Media for the Viewer this request belongs to.
 *
 * The form carries what the Visitor did — the Kind, the id, and the state
 * of the button they pressed — and never what should happen. `marked` decides
 * that here, against the row as it really is, so a page that fell behind
 * another tab cannot carry a delete instruction in a hidden field.
 *
 * In this order on purpose: the Viewer first, so a signed-out Visitor with a
 * tampered form is sent to sign in rather than shown a stack trace; then the
 * input, which throws rather than returns because our own form cannot
 * produce it. Only the write itself is an outcome the Visitor is told about.
 *
 * The Viewer's id comes from the session and from nowhere else. The form does
 * not carry one, and this action would not read it if it did.
 * — `docs/adr/0005-the-viewer-lives-beside-the-domain.md`
 */
export const mark = async (formData: FormData): Promise<MarkResult> => {
  const currentViewer = await viewer();

  if (!currentViewer) {
    // the destination only: nothing is replayed once they are back
    const destination = nextPath(String(formData.get('next') ?? ''));

    redirect(`/sign-in?next=${encodeURIComponent(destination)}`);
  }

  const kind = String(formData.get('kind') ?? '');
  const id = String(formData.get('id') ?? '');
  const pressed = String(formData.get('state') ?? '');

  if (!isKind(kind)) throw new Error(`Unknown Kind: ${kind}`);
  if (!isMediaId(id)) throw new Error(`Not a TMDB id: ${id}`);
  if (!isWatchState(pressed)) throw new Error(`Unknown state: ${pressed}`);

  const ref: MediaRef = { kind, id: Number(id) };

  try {
    const lookup = await watchLookup(currentViewer.id, [ref]);
    const state = marked(stateOf(lookup, ref), pressed);

    if (state) {
      await writeWatchRecord(currentViewer.id, ref, state);
    } else {
      await clearWatchRecord(currentViewer.id, ref);
    }

    return { state };
  } catch (cause) {
    console.error(`Marking ${watchKey(ref)} failed:`, cause);

    return { error: 'Could not mark that. Try again in a moment.' };
  }
};

/**
 * `mark` for the form itself, before hydration: the browser posts, the page
 * re-renders with the row as it now is, and there is nobody to hand a result
 * to — which is also why React types a form's `action` as returning nothing.
 * Once hydrated, the buttons' own handler calls `mark` and reads the result.
 */
export const markFromForm = async (formData: FormData): Promise<void> => {
  await mark(formData);
};
