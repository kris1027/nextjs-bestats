# The Watchlist and the Watched list are one record

A Watch Record is Planned or Watched. One row per Viewer per piece of Media,
keyed `(viewer_id, kind, tmdb_id)`, with the state as a Postgres enum. Marking
Watched takes the Media off the Watchlist because it moves the row; marking
Planned puts it back the same way. Unmarking deletes the row.

Two tables, or one table with two booleans, would each have permitted a state
the domain does not have: Media that is both planned and watched, or neither
while still holding a row. Every read would then have had to decide what such a
row meant, and every write would have had to remember not to create one. With
one row and an enum there is nothing to remember, because Postgres will not
store the fourth case.

The key is composite because a TMDB id is unique only within a Kind. `tv/1399`
and `movie/1399` are different Media, and a key of `(viewer_id, tmdb_id)` would
have let one of them evict the other.

## Consequences

The invariant is enforced by the schema rather than by the code that writes it,
which means it is testable without going through the application at all:
inserting the same `(viewer_id, kind, tmdb_id)` twice is rejected by the
database, and so is a state that is neither Planned nor Watched.

There is no history. Marking something Planned again after watching it leaves
no trace that it was ever Watched, and the timestamp is the moment of the last
marking rather than the moment of watching. Watch dates of a Viewer's own are
deferred to v2, and adding them means adding columns, not unpicking this shape.

A Postgres enum takes new values easily and gives them up painfully. Should a
third state ever be wanted, it can be added; should one need removing, that is
a migration with a rewrite in it.
