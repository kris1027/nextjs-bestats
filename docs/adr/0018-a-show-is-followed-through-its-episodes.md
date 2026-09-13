# A Show is followed through its Episodes

A Viewer watches a Show one Episode at a time, and each Episode is a Watch
Record of its own: Watched, at a Score, and in no other state. A Show is never
Watched. Its own record is Planned, before the Viewer has watched any of its
Episodes, or Stopped, once they have given up on it, and a Show a Viewer is
partway through has no record of its own at all. How far they have got — the
next Episode, whether they are waiting for one, whether they have finished —
is read off their Episodes' records and TMDB, and never stored.

This narrows `docs/adr/0016-a-score-is-what-makes-a-record-watched.md` to
Movies and Episodes. A Score is still what makes a record Watched; a Show is
just no longer something a record can say that about.

## Considered options

A Show-level Score kept beside per-Episode Scores was rejected because the two
disagree the moment they exist — a Show at 9 whose Episodes average 6 — and
every read would have to pick one. It is the argument 0007 made against two
booleans, arriving a third time.

A Show record that stores a position ("last watched: S1E1") was rejected
because the Viewer asked to score each Episode, and a position has nowhere to
keep a Score.

Watching an Episode without scoring it, as TV Time allows, was rejected to
keep one rule across the app. The cost is real: a Viewer joining a Show three
seasons in scores each Episode they want counted, one page at a time.

## Consequences

Scoring an Episode deletes the Show's Planned record, and a Planned press on a
Show the Viewer is under way with is refused, so "Planned lasts until the
first Episode" cannot be undone from a stale page. Scoring an Episode of a
Stopped Show deletes the Stopped record, which is how a Viewer resumes.
Unscoring every Episode of a Show that has no record leaves nothing, so it
leaves every list; a Stopped record survives the same, because unscoring is
not changing one's mind about having given up.

The next Episode is the one after the furthest the Viewer has watched, not the
earliest they have not: a Viewer who joins at season three is not asked about
season one. Specials, TMDB's season 0, can be scored and never count towards
furthest or next. An Episode that has not aired, or has no air date, cannot be
scored, and the action refuses it rather than only hiding the stars.

A Show has ended when TMDB's `status` is `Ended` or `Canceled`, and a Viewer
has finished it when it has ended and TMDB lists no Episode after their
furthest. Anything else with nothing left to watch is waiting, and a status
the app does not recognise counts as waiting, since wrongly holding a Show in
Upcoming is visible and harmless while wrongly calling it finished is a claim
about the Viewer. A cancelled Show that is picked up again moves back without
anyone touching it, which is correct: the lists are derived.

The three lists are disjoint again. The Watchlist is what a Viewer can watch
now, Upcoming what they are waiting for, and Watched → Shows the Shows they
have finished; Stopped Shows appear on their own page and in none of them.

Every Watched Show record is deleted, in a migration of its own that runs
before the new constraint exists, for 0016's reason: inventing a Score for
each Episode states facts nobody gave, and moving them to Planned or Stopped
claims something the Viewer did not say.

Marking an Episode happens on its own page, `/tv/{id}/season/{n}/episode/{m}`,
for 0016's reason: that is where ten stars still fit at the 320px floor. A
Watchlist card for a Show links to its next Episode's page, so watching a run
is score, next, score. A Gone Show a Viewer is under way with is the one card
that offers Stop watching, as `AbsentCard` offers Planned today, since its
page 404s and its card is the only place left to act.
