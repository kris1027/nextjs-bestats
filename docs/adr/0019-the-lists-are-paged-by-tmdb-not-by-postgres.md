# The lists are paged by TMDB's answers, not by Postgres

Which list a tracked Movie or Show belongs on — the Watchlist, Upcoming, or
Watched — depends on TMDB's release dates, air dates and `status`, none of
which a Watch Record holds. So a list page reads every Watch Record the Viewer
is tracking, asks TMDB about each, places, orders and pages them in memory,
and no longer pages in SQL. A Viewer tracks at most 200 Movies and Shows, so
that cost has a ceiling and says where it is.

## Considered options

Storing the next Episode, its air date and whether a Show has ended on the
record would have given Postgres its paging back. It is the copy of TMDB that
`docs/adr/0006-a-watch-record-stores-no-copy-of-tmdb.md` refuses, and it is
wrong the moment TMDB moves a date — which is exactly the fact these lists
exist to show — so it would have needed a job to keep refreshing it.

No paging at all is this decision with the ceiling taken away.

## Consequences

A list render costs one TMDB round per tracked item, plus a season's Episodes
for a Show under way, whatever page is open. The `lib/tmdb` cache is what
keeps a second visit cheap, and the ceiling is what keeps a first one bounded.

The ceiling bounds Watched → Shows too, since a finished Show is tracked like
any other. It keeps the latest marked, and a finished Show is never marked
again, so the Viewer's oldest finished Shows are the first it leaves off. What
it leaves off is on no page and in no tally, so a list the ceiling cut short
says so above its grid rather than letting those Shows vanish. The Watched
list's Movies are Watch Records Postgres pages, and no ceiling touches them.

Order is the lists' own again, but computed: the Watchlist by the Viewer's
latest marking on the Movie, the Show or any of its Episodes; Upcoming by the
soonest air or release date, undated last; Watched → Shows by when the
Viewer scored the Episode that finished it.

A tracked item TMDB does not answer for, or that is Gone, cannot be placed,
so it is drawn on both the Watchlist and Upcoming rather than dropped from
either — the glossary's Unanswered is never an absence.

The tallies on the Kind tabs come from the same placed set, not from a
grouped Postgres query, since Postgres can no longer say which list a record
is on.
