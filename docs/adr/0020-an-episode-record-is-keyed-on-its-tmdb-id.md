# An Episode's record is keyed on its TMDB id

An Episode's Watch Record is keyed on the Viewer and the Episode's own TMDB
id, and carries the Show's id beside it. It does not store the season or the
episode number, although the Episode's address is
`/tv/{id}/season/{n}/episode/{m}`.

TMDB renumbers Episodes — a two-part pilot merged, a season split, a special
moved into season 0 — and an Episode's position moves while its id stays. A
key on `(show, season, episode)` would leave a Viewer's 8 sitting at S1E2
after S1E2 had become a different Episode, with nothing to say so: a row that
goes quietly wrong, which is what `docs/adr/0007-watchlist-and-watched-are-one-record.md`
set the schema up to refuse. Storing the id and the position together, to
keep ordering in SQL, is a copy of TMDB that goes stale on exactly that
renumbering, and `docs/adr/0006-a-watch-record-stores-no-copy-of-tmdb.md`
refuses it besides.

The Show's id is the app's own relationship rather than a TMDB snapshot, and
it is what lets a Show's records be found without TMDB.

The records are a table of their own rather than rows in `watch_records`.
Sharing that table would have meant `episode` in `media_kind`, and an Episode
is not a Kind — a Kind is a Show or a Movie and never a third thing — and it
would have stretched `(viewer_id, kind, tmdb_id)` and the Score constraint
over something with one state where Media has two.

## Consequences

Postgres cannot say which Episode is furthest: it holds ids with no order.
TMDB's season lists put them in order, which the lists already ask for —
`docs/adr/0019-the-lists-are-paged-by-tmdb-not-by-postgres.md`.

An Episode's page resolves its address to an id through TMDB before it can
read the Viewer's record.

An Episode TMDB no longer has is Gone. It has no position left to address, so
its page cannot exist; the Show's page lists it among the Episodes no longer
on TMDB, with its Score and a way to unscore it, and it never counts towards
furthest. It is never deleted by a read, since one wrong answer from TMDB
would otherwise destroy a Score.
