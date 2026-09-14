import type { MediaRef } from '@/lib/media';
import { type MarkResult, mark, markFromForm } from '@/lib/watch-actions';

/**
 * What a marking control presses: the action its hydrated buttons call and
 * read a result from, the same action as the form posts it before hydration,
 * and the hidden fields naming what the press is about. One value because the
 * three are only right together — a form posting one action while its
 * buttons call another is not a type error, and neither is a form naming
 * something the action it posts to does not mark.
 */
type MarkingTarget = {
  press: (formData: FormData) => Promise<MarkResult>;
  post: (formData: FormData) => Promise<void>;
  fields: Readonly<Record<string, string>>;
};

/** A piece of Media, marked Planned or Watched at a Score. */
const mediaTarget = ({ kind, id }: MediaRef): MarkingTarget => ({
  press: mark,
  post: markFromForm,
  fields: { kind, id: String(id) },
});

export { mediaTarget, type MarkingTarget };
