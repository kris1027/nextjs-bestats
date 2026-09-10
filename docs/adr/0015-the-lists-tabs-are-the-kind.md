# The lists' tabs are the Kind

`/watchlist` and `/watched` show one Kind at a time, named by `?kind=`, and
their tab row is Shows and Movies. Moving between the two lists is the site
header's job alone.

The row used to be Watchlist and Watched. That made it the second control on
the page doing what `components/layout/list-links.tsx` already did, and it
left the distinction a Viewer could not see at all: a `MediaCard` never names
its Kind, so a list holding both could only be read by recognising the titles.
One row, and two things wanting it — the state, which the header already says,
and the Kind, which nothing did.

The Kind won, and it wins the same row on trending and on search, so the three
grids in the app now agree about what a tab row above a grid means.

## Consequences

The header is the only way between the Watchlist and the Watched list, and
below `sm:` it is a bookmark and a check with their words read but not drawn
— `docs/adr/0014-the-narrow-header-gives-up-words.md`. The state tallies the
old tabs wore are gone from the page; the two on the new tabs are that state's
Shows and Movies, which is what the tab under them shows.

`?kind=` rather than client state, unlike trending. Trending can hold its Kind
in `components/ui/tabs.tsx` because it fetches both Kinds up front and has
forty items in hand; a list is paged and each record costs a TMDB request
— `docs/adr/0006-a-watch-record-stores-no-copy-of-tmdb.md` — so both Kinds
ready at once is twice the page. And `?page=` is already in the address: a
Kind that lived in the client would reset to Shows on every `Next`. This is
the coupling `docs/adr/0004-search-is-two-searches.md` predicted for paging,
arriving where it said it would.

A page is therefore one Kind's, and so is its `total`, its page count and its
`?page=`. The Kind tabs drop `?page=` when they link, because page 3 of the
Shows is often past the end of the Movies and `ListPage` answers a page past
the end with `notFound()`.

They replace rather than push, which the tabs they replaced did not: those
were the way between two pages and these are two views of one. It is what the
app's other two Kind rows do — `/search` replaces, and trending keeps its Kind
in the client, where there is no history entry to make — so no tab row in the
app puts a press of Back between a Viewer and the page they arrived from. What
is a page still pushes: `Previous` and `Next` are ordinary links, and Back
after one returns to the page before it. The cost is that Back after a tab
does not return to the other tab, which is the same trade `/search` made.

An empty tab says which Kind is empty. "Nothing planned yet" was true of a
list and is false of a tab, since the other one may hold twenty.

Which tab opens when the address names none is read off both counts — a
Watchlist that is all Movies opens on Movies — which is `/search`'s rule and
`/search`'s reason: a Kind with something in it is never left behind a closed
tab. That costs the ordering. The counts have to land before the Kind is
known, so the records query now waits on one grouped Postgres query, shared
between the two Suspense boundaries by `cache` the way `app/page.tsx` shares
its lookup.

It also costs the fallback a selection. The tabs stream in, and until the
counts land no tab can honestly claim to be the open one, so the fallback
marks neither and the real row marks one. `/search` marks what its address
named and guesses `tv` only where it named nothing, because that fallback is
drawn inside a boundary which has already read `?kind=`. A list's fallback is
the prerendered shell — `docs/adr/0010-the-shell-is-prerendered.md` — and
reads no `searchParams` at all, so it cannot mark even the Kind an address
does name; the default is beyond it twice over, being read off counts the
shell has not got either. A mark that appears is a smaller lie than a mark
that jumps.

`watch_records_viewer_state_idx` is now a prefix of the list query rather than
the whole of it: the Kind narrows on top of `(viewer_id, state)` and is not in
the index. One Viewer's list is small enough that this has not been worth a
migration, and the comment on the index says so rather than continuing to
claim the index is exact.

The mixed, newest-first view of a whole list is gone, and there is no All tab
to bring it back. A Kind is one of two and never absent, so an All tab would
be a third value in `?kind=` that `isKind` could not guard — a distinction the
glossary does not have, added to the one place the app spells that glossary
into an address.
