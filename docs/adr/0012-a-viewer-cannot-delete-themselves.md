# A Viewer cannot delete themselves

BeStats has no way for a Viewer to delete their account, and no `/settings`
page. It had both, and neither ever worked: `auth.deleteUser()` answers with a
bare HTTP 404 on Neon's Managed Better Auth, so every press of "Delete
everything" came back to `/settings?error=failed` — "That did not work. Try
again in a moment." — for a thing that was never going to work.

Better Auth registers `delete-user` only where user deletion is enabled, and
that configuration is Neon's, not ours, exactly as `docs/adr/0005` warned it
would be. Neon documents deleting a user through the management API instead,
which wants a project-scoped key.

## How it read as something else

The error said `code: 'user_not_found'`, `status: 404`, on a request made one
tick after the page had rendered that Viewer's own name. That code is not Better
Auth's answer. Neon's SDK maps an unrecognised response to an error code by
HTTP status alone, and its table maps `404` to `UserNotFound`; the `message`
was the bare string `Not Found`, which is the status text and not a message
anyone wrote. So a missing *route* arrived spelled as a missing *Viewer*.

Worth keeping in mind when reading any error from `@neondatabase/auth`: a code
that names a domain object may only be naming a status.

## Considered and rejected

- **Delete the app's own rows and sign out.** `watch_records` and
  `marking_tallies` are ours to delete, and the integration suite could cover
  it end to end. Rejected because the sign-in would survive, so the promise
  would have to shrink to "this deletes your Watch Records" — a different
  feature wearing the same button.
- **Call Neon's management API.** Keeps the promise exactly and keeps the
  cascade doing the work. Rejected because it puts a key that can delete any
  Viewer in the project into production environment variables, reachable from a
  Server Action. A self-service delete should not be able to reach anyone but
  the caller.
- **Leave the button and improve the message.** Rejected because there is no
  honest message for a button that cannot do its job.

## Consequences

**`/settings` goes with it.** Sign-out lives in the header, and everything else
on that page was the name the header already shows or the fine print of a
delete warning. So the route, its `loading.tsx` and `SettingsLink` are gone,
and the header's name and avatar are plain text — which also leaves the header
with no client component of its own.

**The deletion vocabulary goes too.** `DELETION_REFUSALS` was `stale | failed`,
and its comment said neither the action nor the page "may invent a third". The
missing third word was never `stale` or `failed` but *this cannot work*, and
the shape of that list is why a permanent 404 was reported as something to
retry. A two-word enum that cannot say "never" will say "later" instead.

**The cascade in `drizzle/0001` and `drizzle/0003` stays.** Nothing in the app
deletes a Viewer now, but the foreign keys are still the reason a Viewer
deleted by any other means — Neon's console, the management API, a test's
`dropViewer` — takes their Watch Records with them. `docs/adr/0005` is
unchanged on that point; only the app's own door is closed.

**`CONTEXT.md` is untouched.** The glossary never had a word for leaving, so
removing the feature removes no vocabulary. That is worth noting rather than
assuming: it means nothing a Viewer *is* has changed, only something they could
be offered.

Putting deletion back means Neon exposing the route, or one of the two rejected
options above becoming acceptable. It is a page and an action, not an
architecture.
